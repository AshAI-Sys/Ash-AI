// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0');
    const sinceDate = new Date(since);

    const changes = await getChangesForUser(session.user.id, sinceDate);

    return NextResponse.json({
      success: true,
      changes: changes,
      timestamp: Date.now()
    });

  } catch (_error) {
    console.error('Sync download error:', _error);
    return NextResponse.json(
      { error: 'Failed to download changes' },
      { status: 500 }
    );
  }
}

interface SyncChange {
  timestamp: number;
  user_id: string;
  entity: string;
  entityId: string;
  operation: string;
  data: Record<string, unknown>;
}

async function getChangesForUser(user_id: string, since: Date) {
  const changes: SyncChange[] = [];

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assignedTo: user_id },
        { order: { createdById: user_id } }
      ],
      updated_at: { gt: since }
    },
    include: {
      order: true
    }
  });

  tasks.forEach(task => {
    changes.push({
      timestamp: new Date(task.updated_at).getTime(),
      user_id,
      entity: 'Task',
      entityId: task.id,
      operation: 'UPDATE',
      data: {
        status: task.status,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        rejectedAt: task.rejectedAt,
        rejectReason: task.rejectReason
      }
    });
  });

  const timeRecords = await prisma.timeRecord.findMany({
    where: {
      employeeId: user_id,
      created_at: { gt: since }
    }
  });

  timeRecords.forEach(record => {
    changes.push({
      timestamp: new Date(record.created_at).getTime(),
      user_id,
      entity: 'TimeRecord',
      entityId: record.id,
      operation: 'CREATE',
      data: {
        date: record.date,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        hoursWorked: record.hoursWorked,
        notes: record.notes
      }
    });
  });

  const inventoryUpdates = await prisma.stockMovement.findMany({
    where: {
      created_at: { gt: since }
    },
    include: {
      inventory: true
    }
  });

  inventoryUpdates.forEach(movement => {
    changes.push({
      timestamp: new Date(movement.created_at).getTime(),
      user_id,
      entity: 'StockMovement',
      entityId: movement.id,
      operation: 'CREATE',
      data: {
        inventoryId: movement.inventoryId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference
      }
    });
  });

  const qcRecords = await prisma.qCRecord.findMany({
    where: {
      inspectorId: user_id,
      created_at: { gt: since }
    }
  });

  qcRecords.forEach(record => {
    changes.push({
      timestamp: new Date(record.created_at).getTime(),
      user_id,
      entity: 'QCRecord',
      entityId: record.id,
      operation: 'CREATE',
      data: {
        order_id: record.order_id,
        taskId: record.taskId,
        status: record.status,
        passedQty: record.passedQty,
        rejectedQty: record.rejectedQty,
        rejectReason: record.rejectReason,
        notes: record.notes
      }
    });
  });

  return changes.sort((a, b) => a.timestamp - b.timestamp);
}