// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Clock, Users, TrendingUp, AlertTriangle, 
  CheckCircle2, Pause, Play, RotateCcw, Zap
} from 'lucide-react';

// Real-Time Production Tracker - CLIENT_UPDATED_PLAN.md Implementation
// Live production monitoring with stage transitions and alerts

interface ProductionStage {
  id: string;
  stage: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  order_id: string;
  po_number: string;
  started_at?: Date;
  completed_at?: Date;
  operator?: { name: string; id: string };
  machine?: { name: string; code: string };
  efficiency_percentage?: number;
  quality_score?: number;
  defect_count?: number;
  estimated_duration?: number;
  actual_duration?: number;
}

interface RealTimeTrackerProps {
  workspace_id: string;
  refreshInterval?: number;
}

export default function RealTimeTracker({ 
  workspace_id, 
  refreshInterval = 5000 
}: RealTimeTrackerProps) {
  const [activeProduction, setActiveProduction] = useState<ProductionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    total_active: 0,
    efficiency_avg: 0,
    quality_avg: 0,
    alerts_count: 0
  });

  // Real-time data fetching
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchProductionData = async () => {
      try {
        const response = await fetch(`/api/production/tracking?active_only=true`);
        if (!response.ok) throw new Error('Failed to fetch production data');
        
        const data = await response.json();
        if (data.success) {
          setActiveProduction(data.data.active_production);
          setMetrics({
            total_active: data.data.summary.total_active,
            efficiency_avg: data.data.summary.today_metrics.average_efficiency,
            quality_avg: data.data.summary.today_metrics.average_quality,
            alerts_count: data.data.active_production.filter((p: ProductionStage) => 
              p.status === 'FAILED' || (p.efficiency_percentage && p.efficiency_percentage < 70)
            ).length
          });
        }
      } catch (error) {
        console.error('Production tracking fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductionData();
    interval = setInterval(fetchProductionData, refreshInterval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workspace_id, refreshInterval]);

  const updateStageStatus = async (stageId: string, newStatus: string) => {
    try {
      const stage = activeProduction.find(p => p.id === stageId);
      if (!stage) return;

      const response = await fetch('/api/production/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: stage.order_id,
          stage: stage.stage,
          status: newStatus,
          notes: `Status changed to ${newStatus} via real-time tracker`
        })
      });

      if (!response.ok) throw new Error('Failed to update stage status');
      
      // Refresh data immediately after update
      const updatedData = await fetch(`/api/production/tracking?active_only=true`);
      const result = await updatedData.json();
      if (result.success) {
        setActiveProduction(result.data.active_production);
      }
    } catch (error) {
      console.error('Stage update error:', error);
      alert('Failed to update stage status. Please try again.');
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IN_PROGRESS': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PAUSED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'FAILED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStageIcon = (stage: string) => {
    const icons: Record<string, React.ReactNode> = {
      'CUTTING': <Activity className="w-4 h-4" />,
      'PRINTING': <Zap className="w-4 h-4" />,
      'SEWING': <Users className="w-4 h-4" />,
      'FINISHING': <CheckCircle2 className="w-4 h-4" />,
      'QC': <AlertTriangle className="w-4 h-4" />,
      'PACKING': <Activity className="w-4 h-4" />
    };
    return icons[stage] || <Activity className="w-4 h-4" />;
  };

  const calculateProgress = (stage: ProductionStage): number => {
    if (stage.status === 'COMPLETED') return 100;
    if (stage.status === 'FAILED') return 0;
    if (stage.status === 'PLANNED') return 0;
    
    if (stage.started_at && stage.estimated_duration) {
      const elapsed = (Date.now() - new Date(stage.started_at).getTime()) / (1000 * 60 * 60);
      return Math.min(Math.round((elapsed / stage.estimated_duration) * 100), 95);
    }
    
    return stage.status === 'IN_PROGRESS' ? 45 : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Real-Time Production Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🔴 Real-Time Production Tracker
        </h1>
        <p className="text-blue-200">
          Live monitoring of all active production stages • Updates every {refreshInterval/1000}s
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-blue-400" />
            <span className="text-green-400 text-sm font-semibold">LIVE</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{metrics.total_active}</div>
          <div className="text-blue-200 text-sm">Active Stages</div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-blue-400 text-xs">AVG TODAY</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{metrics.efficiency_avg.toFixed(1)}%</div>
          <div className="text-blue-200 text-sm">Efficiency</div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="text-blue-400 text-xs">AVG TODAY</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{metrics.quality_avg.toFixed(1)}%</div>
          <div className="text-blue-200 text-sm">Quality Score</div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className={`w-8 h-8 ${metrics.alerts_count > 0 ? 'text-red-400' : 'text-gray-400'}`} />
            {metrics.alerts_count > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                ALERT
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">{metrics.alerts_count}</div>
          <div className="text-blue-200 text-sm">Active Alerts</div>
        </div>
      </div>

      {/* Active Production Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeProduction.map((stage) => {
          const progress = calculateProgress(stage);
          const isAlert = stage.status === 'FAILED' || 
            (stage.efficiency_percentage && stage.efficiency_percentage < 70);

          return (
            <div 
              key={stage.id}
              className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 hover:bg-white/20 cursor-pointer ${
                isAlert ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/20'
              } ${selectedStage === stage.id ? 'ring-2 ring-blue-500/50' : ''}`}
              onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500`}>
                    {getStageIcon(stage.stage)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{stage.stage}</h3>
                    <p className="text-blue-200 text-sm">{stage.po_number}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(stage.status)}`}>
                  {stage.status}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-blue-200">Progress</span>
                  <span className="text-white font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      stage.status === 'COMPLETED' ? 'bg-green-500' :
                      stage.status === 'FAILED' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stage Details */}
              <div className="space-y-2 mb-4">
                {stage.operator && (
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-blue-200">Operator:</span>
                    <span className="text-white ml-1">{stage.operator.name}</span>
                  </div>
                )}
                
                {stage.machine && (
                  <div className="flex items-center text-sm">
                    <Activity className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-blue-200">Machine:</span>
                    <span className="text-white ml-1">{stage.machine.name}</span>
                  </div>
                )}

                {stage.efficiency_percentage && (
                  <div className="flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-blue-200">Efficiency:</span>
                    <span className={`ml-1 font-semibold ${
                      stage.efficiency_percentage >= 90 ? 'text-green-400' :
                      stage.efficiency_percentage >= 70 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {stage.efficiency_percentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {stage.status === 'PLANNED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStageStatus(stage.id, 'IN_PROGRESS');
                    }}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-green-500/30"
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    Start
                  </button>
                )}
                
                {stage.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStageStatus(stage.id, 'PAUSED');
                      }}
                      className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-yellow-500/30"
                    >
                      <Pause className="w-4 h-4 inline mr-1" />
                      Pause
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStageStatus(stage.id, 'COMPLETED');
                      }}
                      className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-emerald-500/30"
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Complete
                    </button>
                  </>
                )}
                
                {stage.status === 'PAUSED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStageStatus(stage.id, 'IN_PROGRESS');
                    }}
                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-blue-500/30"
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    Resume
                  </button>
                )}

                {stage.status === 'FAILED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStageStatus(stage.id, 'IN_PROGRESS');
                    }}
                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-blue-500/30"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    Retry
                  </button>
                )}
              </div>

              {/* Alert Badge */}
              {isAlert && (
                <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                    <span className="text-red-300 text-sm font-medium">
                      {stage.status === 'FAILED' ? 'Production Failed' : 'Low Efficiency Alert'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeProduction.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No Active Production</h3>
          <p className="text-blue-200">All production stages are completed or not yet started.</p>
        </div>
      )}
    </div>
  );
}