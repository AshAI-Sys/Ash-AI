'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Package,
  AlertTriangle,
  TrendingUp,
  FileText,
  Eye
} from 'lucide-react'

interface PrintRunCardProps {
  run: {
    id: string
    orderNumber: string
    brandName: string
    clientName: string
    method: string
    workcenter: string
    status: 'CREATED' | 'IN_PROGRESS' | 'PAUSED' | 'DONE' | 'CANCELLED'
    stepName: string
    machineName: string
    startedAt?: string
    endedAt?: string
    createdBy: string
    created_at: string
    totalGood: number
    totalReject: number
    materialsUsed: number
    rejectCount: number
  }
  onStart?: (runId: string) => void
  onPause?: (runId: string) => void
  onComplete?: (runId: string) => void
  onViewDetails?: (runId: string) => void
}

export function PrintRunCard({ 
  run, 
  onStart, 
  onPause, 
  onComplete, 
  onViewDetails 
}: PrintRunCardProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      case 'CREATED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <CheckCircle className="w-4 h-4" />
      case 'IN_PROGRESS': return <Play className="w-4 h-4" />
      case 'PAUSED': return <Pause className="w-4 h-4" />
      case 'CANCELLED': return <XCircle className="w-4 h-4" />
      case 'CREATED': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'SILKSCREEN': return 'bg-green-100 text-green-800'
      case 'SUBLIMATION': return 'bg-blue-100 text-blue-800'
      case 'DTF': return 'bg-purple-100 text-purple-800'
      case 'EMBROIDERY': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalProduced = () => run.totalGood + run.totalReject
  const getQualityRate = () => {
    const total = getTotalProduced()
    return total > 0 ? (run.totalGood / total) * 100 : 0
  }

  const getDuration = () => {
    if (!run.startedAt) return null
    const start = new Date(run.startedAt)
    const end = run.endedAt ? new Date(run.endedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  return (
    <Card className="enhanced-card hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {run.orderNumber}
            </CardTitle>
            <div className="flex flex-col space-y-1 text-sm text-gray-600">
              <span>{run.brandName}</span>
              <span>{run.clientName}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={`flex items-center space-x-1 text-xs ${getStatusColor(run.status)}`}>
              {getStatusIcon(run.status)}
              <span>{run.status.replace('_', ' ')}</span>
            </Badge>
            <Badge className={`text-xs ${getMethodColor(run.method)}`}>
              {run.method}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Production Details */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Machine:</span>
              <div className="font-medium">{run.machineName}</div>
            </div>
            <div>
              <span className="text-gray-500">Step:</span>
              <div className="font-medium">{run.stepName}</div>
            </div>
            <div>
              <span className="text-gray-500">Operator:</span>
              <div className="font-medium">{run.createdBy}</div>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <div className="font-medium">{getDuration() || 'Not started'}</div>
            </div>
          </div>
        </div>

        {/* Production Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-700">{run.totalGood}</div>
            <div className="text-xs text-gray-500">Good</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-700">{run.totalReject}</div>
            <div className="text-xs text-gray-500">Reject</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-700">{getQualityRate().toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Quality</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-700">{run.materialsUsed}</div>
            <div className="text-xs text-gray-500">Materials</div>
          </div>
        </div>

        {/* Quality Indicators */}
        {run.totalReject > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {run.rejectCount} reject record{run.rejectCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {getQualityRate() >= 95 && run.totalGood > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center space-x-2 text-green-700">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Excellent quality rate: {getQualityRate().toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {run.status === 'CREATED' && onStart && (
            <Button 
              size="sm" 
              onClick={() => onStart(run.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}

          {run.status === 'IN_PROGRESS' && (
            <>
              {onPause && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onPause(run.id)}
                  className="flex-1"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
              {onComplete && (
                <Button 
                  size="sm" 
                  onClick={() => onComplete(run.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </>
          )}

          {run.status === 'PAUSED' && onStart && (
            <Button 
              size="sm" 
              onClick={() => onStart(run.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}

          {run.status === 'DONE' && (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-1" />
              Report
            </Button>
          )}

          {onViewDetails && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onViewDetails(run.id)}
              className="flex-none"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div>Created: {new Date(run.created_at).toLocaleString()}</div>
          {run.startedAt && (
            <div>Started: {new Date(run.startedAt).toLocaleString()}</div>
          )}
          {run.endedAt && (
            <div>Completed: {new Date(run.endedAt).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}