// 🎖️ MACHINE MONITORING DASHBOARD API
// Commander Protocol: Real-time machine telemetry and performance monitoring
// Neural ERP - Machine Intelligence System

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { productionTracker } from '@/lib/production-tracker';
import { prisma } from '@/lib/prisma';

// GET: Machine monitoring dashboard data
async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const machine_id = searchParams.get('machine_id');
    const line_id = searchParams.get('line_id');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Get machine metrics
    const machines = await prisma.machineMetrics.findMany({
      where: {
        ...(machine_id && { machine_id }),
        ...(line_id && { machine_id: { startsWith: line_id } }),
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: machine_id ? 100 : 20 // More data for single machine view
    });

    // Get production line metrics
    const lineMetrics = line_id
      ? await productionTracker.getProductionLineMetrics(line_id)
      : null;

    // Calculate summary statistics
    const activeMachines = machines.filter(m => m.status === 'RUNNING');
    const totalEfficiency = machines.reduce((sum, m) => sum + m.efficiency, 0);
    const avgEfficiency = machines.length > 0 ? totalEfficiency / machines.length : 0;
    const totalPieces = machines.reduce((sum, m) => sum + m.total_pieces_today, 0);
    const machinesNeedingMaintenance = machines.filter(m =>
      new Date(m.next_maintenance) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Group machines by status for overview
    const machinesByStatus = machines.reduce((acc, machine) => {
      acc[machine.status] = (acc[machine.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        machines,
        line_metrics: lineMetrics,
        summary: {
          total_machines: machines.length,
          active_machines: activeMachines.length,
          average_efficiency: Math.round(avgEfficiency * 10) / 10,
          total_pieces_today: totalPieces,
          machines_needing_maintenance: machinesNeedingMaintenance,
          machines_by_status: machinesByStatus
        },
        alerts: await getMachineAlerts(machines)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🚨 [MACHINE API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine data' },
      { status: 500 }
    );
  }
}

// POST: Update machine metrics
async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role as Role;
    if (!['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update machine metrics via production tracker
    const updatedMetrics = await productionTracker.updateMachineMetrics({
      machine_id: body.machine_id,
      machine_type: body.machine_type,
      status: body.status,
      efficiency: body.efficiency,
      uptime_hours: body.uptime_hours,
      pieces_per_hour: body.pieces_per_hour,
      power_consumption: body.power_consumption,
      temperature: body.temperature,
      vibration_level: body.vibration_level,
      error_count: body.error_count,
      total_pieces_today: body.total_pieces_today,
      current_order_id: body.current_order_id,
      current_stage: body.current_stage,
      operator_id: body.operator_id || session.user.id
    });

    return NextResponse.json({
      success: true,
      data: updatedMetrics,
      message: `Machine ${body.machine_id} metrics updated successfully`
    });
  } catch (error) {
    console.error('🚨 [MACHINE API] Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update machine metrics' },
      { status: 500 }
    );
  }
}

// Helper function to generate machine alerts
async function getMachineAlerts(machines: any[]) {
  const alerts = [];

  for (const machine of machines) {
    // Efficiency alerts
    if (machine.efficiency < 50) {
      alerts.push({
        machine_id: machine.machine_id,
        type: 'LOW_EFFICIENCY',
        severity: machine.efficiency < 25 ? 'CRITICAL' : 'WARNING',
        message: `Machine efficiency at ${machine.efficiency}%`,
        timestamp: machine.timestamp
      });
    }

    // Temperature alerts
    if (machine.temperature && machine.temperature > 80) {
      alerts.push({
        machine_id: machine.machine_id,
        type: 'HIGH_TEMPERATURE',
        severity: machine.temperature > 90 ? 'CRITICAL' : 'WARNING',
        message: `High temperature: ${machine.temperature}°C`,
        timestamp: machine.timestamp
      });
    }

    // Maintenance alerts
    const maintenanceDue = new Date(machine.next_maintenance);
    const now = new Date();
    const daysUntilMaintenance = Math.ceil((maintenanceDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilMaintenance <= 3) {
      alerts.push({
        machine_id: machine.machine_id,
        type: 'MAINTENANCE_DUE',
        severity: daysUntilMaintenance <= 0 ? 'CRITICAL' : 'WARNING',
        message: daysUntilMaintenance <= 0
          ? 'Maintenance overdue'
          : `Maintenance due in ${daysUntilMaintenance} days`,
        timestamp: machine.timestamp
      });
    }

    // Error count alerts
    if (machine.error_count > 5) {
      alerts.push({
        machine_id: machine.machine_id,
        type: 'HIGH_ERROR_COUNT',
        severity: machine.error_count > 10 ? 'CRITICAL' : 'WARNING',
        message: `High error count: ${machine.error_count} errors`,
        timestamp: machine.timestamp
      });
    }

    // Machine offline alerts
    if (machine.status === 'OFFLINE' || machine.status === 'ERROR') {
      alerts.push({
        machine_id: machine.machine_id,
        type: 'MACHINE_OFFLINE',
        severity: 'CRITICAL',
        message: `Machine ${machine.status.toLowerCase()}`,
        timestamp: machine.timestamp
      });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export { withApiHandler(GET) as GET, withApiHandler(POST) as POST };