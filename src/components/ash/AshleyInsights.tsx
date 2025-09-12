// @ts-nocheck
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package, 
  TrendingUp,
  Zap,
  Settings,
  Info
} from 'lucide-react'

interface AshleyInsightsProps {
  assessment?: any
}

export function AshleyInsights({ assessment }: AshleyInsightsProps) {
  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-300/50">
              <Brain className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Ashley AI</CardTitle>
              <CardDescription className="text-sm">Intake Analysis Pending</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Submit form to get AI assessment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'GREEN': return 'bg-green-100 text-green-800 border-green-200'
      case 'AMBER': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'RED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'GREEN': return <CheckCircle className="h-4 w-4" />
      case 'AMBER': return <AlertTriangle className="h-4 w-4" />
      case 'RED': return <AlertTriangle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'CAPACITY': return <TrendingUp className="h-4 w-4" />
      case 'STOCK': return <Package className="h-4 w-4" />
      case 'TIMING': return <Clock className="h-4 w-4" />
      case 'SAFETY': return <AlertTriangle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-300/50">
              <Brain className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Ashley AI Assessment</CardTitle>
              <CardDescription className="text-sm">
                Confidence: {Math.round(assessment.confidence * 100)}%
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Risk */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Risk:</span>
            <Badge className={getRiskColor(assessment.risk)}>
              <div className="flex items-center gap-1">
                {getRiskIcon(assessment.risk)}
                {assessment.risk}
              </div>
            </Badge>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI Confidence</span>
              <span>{Math.round(assessment.confidence * 100)}%</span>
            </div>
            <Progress value={assessment.confidence * 100} className="h-2" />
          </div>

          {/* Issues */}
          {assessment.issues && assessment.issues.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues Identified
              </h4>
              <div className="space-y-2">
                {assessment.issues.map((issue: any, index: number) => (
                  <Alert 
                    key={index} 
                    variant={issue.severity === 'HIGH' ? 'destructive' : 'default'}
                    className="py-2"
                  >
                    <div className="flex items-start gap-2">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase">{issue.type}</span>
                          {issue.workcenter && (
                            <Badge variant="outline" className="text-xs">
                              {issue.workcenter}
                            </Badge>
                          )}
                        </div>
                        <AlertDescription className="text-xs">
                          {issue.details}
                        </AlertDescription>
                        {issue.action && (
                          <p className="text-xs text-muted-foreground italic">
                            → {issue.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {assessment.actions && assessment.actions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Recommended Actions
              </h4>
              <ul className="space-y-1">
                {assessment.actions.map((action: string, index: number) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacity Analysis */}
      {assessment.capacityAnalysis && assessment.capacityAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacity Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessment.capacityAnalysis.map((analysis: any, index: number) => (
              <div key={index} className="space-y-2 pb-3 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{analysis.workcenter}</span>
                  <Badge 
                    variant={analysis.bottleneck ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {Math.round(analysis.utilizationPct)}%
                  </Badge>
                </div>
                <Progress 
                  value={Math.min(analysis.utilizationPct, 100)} 
                  className="h-1"
                />
                <div className="text-xs text-muted-foreground">
                  {Math.round(analysis.requiredMinutes / 60)}h required / {Math.round(analysis.availableMinutes / 60)}h available
                </div>
                {analysis.suggestions && analysis.suggestions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    💡 {analysis.suggestions.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {assessment.insights && assessment.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessment.insights.map((insight: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {insight.type}
                  </Badge>
                  <Badge 
                    className={`text-xs ${
                      insight.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      insight.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    {insight.priority}
                  </Badge>
                </div>
                <div>
                  <h5 className="text-sm font-medium">{insight.title}</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Clear State */}
      {(!assessment.issues || assessment.issues.length === 0) && assessment.risk === 'GREEN' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ✅ All systems go! No issues detected for this order configuration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}