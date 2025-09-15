// 🎖️ MACHINE MONITORING DASHBOARD COMPONENT
// Commander Protocol: Real-time machine telemetry visualization
// Neural ERP - Machine Intelligence Interface

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Gauge,
  Power,
  Settings,
  Thermometer,
  TrendingUp,
  XCircle,
  Wrench
} from 'lucide-react';

interface MachineMetrics {
  machine_id: string;
  machine_type: string;
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE';
  efficiency: number;
  uptime_hours: number;
  pieces_per_hour: number;
  power_consumption: number;
  temperature?: number;
  vibration_level?: number;
  error_count: number;
  total_pieces_today: number;
  current_order_id?: string;
  current_stage?: string;
  operator_id?: string;
  timestamp: string;
}

interface MachineAlert {
  machine_id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  timestamp: string;
}

interface DashboardData {
  machines: MachineMetrics[];
  summary: {
    total_machines: number;
    active_machines: number;
    average_efficiency: number;
    total_pieces_today: number;
    machines_needing_maintenance: number;
    machines_by_status: Record<string, number>;
  };
  alerts: MachineAlert[];
}

export default function MachineMonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      const response = await fetch('/api/production/machines');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch machine data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'IDLE': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'MAINTENANCE': return <Wrench className="h-5 w-5 text-blue-500" />;
      case 'ERROR': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'OFFLINE': return <Power className="h-5 w-5 text-gray-500" />;
      default: return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'IDLE': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      case 'MAINTENANCE': return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      case 'ERROR': return 'bg-red-500/20 text-red-700 border-red-500/50';
      case 'OFFLINE': return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load machine data</p>
        <Button onClick={fetchData} className="mt-4">
          <Activity className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const selectedMachineData = selectedMachine
    ? data.machines.find(m => m.machine_id === selectedMachine)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎖️ Machine Monitoring Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time machine telemetry and performance monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button onClick={fetchData} size="sm" variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Machines</p>
                <p className="text-2xl font-bold">{data.summary.total_machines}</p>
              </div>
              <Cpu className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Machines</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.active_machines}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">{data.summary.average_efficiency}%</p>
              </div>
              <Gauge className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pieces Today</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.total_pieces_today}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Need Maintenance</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.machines_needing_maintenance}</p>
              </div>
              <Wrench className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Machine Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.machines.map((machine) => (
                  <div
                    key={machine.machine_id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedMachine === machine.machine_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMachine(machine.machine_id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(machine.status)}
                        <div>
                          <h3 className="font-semibold">{machine.machine_id}</h3>
                          <p className="text-sm text-gray-600">{machine.machine_type}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(machine.status)}>
                        {machine.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Efficiency</p>
                        <div className="flex items-center gap-2">
                          <Progress value={machine.efficiency} className="flex-1" />
                          <span className="font-medium">{machine.efficiency}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Pieces/Hour</p>
                        <p className="font-medium">{machine.pieces_per_hour}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Uptime</p>
                        <p className="font-medium">{machine.uptime_hours}h</p>
                      </div>
                    </div>

                    {machine.temperature && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Thermometer className="h-4 w-4" />
                        <span>Temperature: {machine.temperature}°C</span>
                        {machine.temperature > 80 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Details */}
        <div className="space-y-6">
          {/* Machine Details */}
          {selectedMachineData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Machine Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-lg">{selectedMachineData.machine_id}</h3>
                  <Badge className={getStatusColor(selectedMachineData.status)}>
                    {selectedMachineData.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Efficiency:</span>
                    <span className="font-medium">{selectedMachineData.efficiency}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pieces per Hour:</span>
                    <span className="font-medium">{selectedMachineData.pieces_per_hour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pieces Today:</span>
                    <span className="font-medium">{selectedMachineData.total_pieces_today}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Power Consumption:</span>
                    <span className="font-medium">{selectedMachineData.power_consumption}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Count:</span>
                    <span className="font-medium">{selectedMachineData.error_count}</span>
                  </div>
                  {selectedMachineData.current_order_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Order:</span>
                      <span className="font-medium">{selectedMachineData.current_order_id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.alerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active alerts</p>
                ) : (
                  data.alerts.slice(0, 10).map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200"
                    >
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{alert.machine_id}</span>
                          <Badge
                            variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}