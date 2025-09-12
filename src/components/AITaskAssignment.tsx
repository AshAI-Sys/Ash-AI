// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  Star, 
  Zap, 
  CheckCircle,
  AlertTriangle,
  Target,
  Brain,
  Sparkles,
  TrendingUp,
  User,
  ArrowRight
} from 'lucide-react'
import type { AssignmentSuggestion } from '@/lib/ai'

interface AITaskAssignmentProps {
  taskIds?: string[]
  onAssignmentApplied?: (taskId: string, assigneeId: string) => void
}

export function AITaskAssignment({ taskIds, onAssignmentApplied }: AITaskAssignmentProps) {
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [applyingTasks, setApplyingTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSuggestions()
  }, [taskIds])  

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true)
      const params = taskIds ? `?taskIds=${taskIds.join(',')}` : ''
      const response = await fetch(`/api/ai/assignments${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Error fetching assignment suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyAssignment = async (suggestion: AssignmentSuggestion) => {
    if (applyingTasks.has(suggestion.taskId)) return

    try {
      setApplyingTasks(prev => new Set(prev).add(suggestion.taskId))
      
      const response = await fetch('/api/ai/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: suggestion.taskId,
          assigneeId: suggestion.suggestedAssignee
        })
      })

      if (response.ok) {
        // Remove applied suggestion from list
        setSuggestions(prev => prev.filter(s => s.taskId !== suggestion.taskId))
        
        // Notify parent component
        if (onAssignmentApplied) {
          onAssignmentApplied(suggestion.taskId, suggestion.suggestedAssignee)
        }
      } else {
        throw new Error('Failed to apply assignment')
      }
    } catch (error) {
      console.error('Error applying assignment:', error)
    } finally {
      setApplyingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(suggestion.taskId)
        return newSet
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'LOW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <Sparkles className="w-4 h-4 text-green-400" />
    if (confidence >= 0.7) return <Star className="w-4 h-4 text-yellow-400" />
    if (confidence >= 0.5) return <Target className="w-4 h-4 text-blue-400" />
    return <AlertTriangle className="w-4 h-4 text-orange-400" />
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">AI Task Assignment</CardTitle>
              <CardDescription className="text-white/70">Analyzing optimal assignments...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-8 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">AI Task Assignment</CardTitle>
              <CardDescription className="text-white/70">All tasks optimally assigned</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">No assignment recommendations at the moment.</p>
            <Button 
              onClick={fetchSuggestions}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              Refresh Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl slide-in-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 float">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">AI Task Assignment</CardTitle>
              <CardDescription className="text-white/70">
                {suggestions.length} intelligent assignment{suggestions.length !== 1 ? 's' : ''} suggested
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={fetchSuggestions}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.taskId}
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 stagger-animation border border-white/10 hover:border-white/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {suggestion.assigneeName.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white group-hover:text-gradient">
                      Assign to {suggestion.assigneeName}
                    </h4>
                    <Badge className={`px-2 py-1 text-xs border ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-white/70 text-sm mb-3 leading-relaxed">
                    {suggestion.reasoning}
                  </p>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 mb-3">
                    <div className="flex items-center gap-2">
                      {getConfidenceIcon(suggestion.confidence)}
                      <span className="text-xs text-white/70">
                        {(suggestion.confidence * 100).toFixed(0)}% match
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-white/70">
                        ~{suggestion.estimatedHours}h estimated
                      </span>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 text-sm mb-1">
                      <span className="text-white/70">Confidence:</span>
                      <span className="text-white font-medium">
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          suggestion.confidence >= 0.8 
                            ? 'bg-gradient-to-r from-green-400 to-green-500'
                            : suggestion.confidence >= 0.6 
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                            : 'bg-gradient-to-r from-blue-400 to-blue-500'
                        }`}
                        style={{ width: `${(suggestion.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => applyAssignment(suggestion)}
                      disabled={applyingTasks.has(suggestion.taskId)}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-none disabled:opacity-50"
                    >
                      {applyingTasks.has(suggestion.taskId) ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Assign Task
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      Task Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Priority indicator */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    suggestion.priority === 'HIGH' ? 'bg-green-400' :
                    suggestion.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-blue-400'
                  } shadow-lg`} />
                  {suggestion.priority === 'HIGH' && (
                    <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Actions */}
        {suggestions.length > 1 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">
                Apply all high-confidence suggestions ({suggestions.filter(s => s.confidence >= 0.8).length} tasks)
              </span>
              <Button
                onClick={() => {
                  suggestions
                    .filter(s => s.confidence >= 0.8)
                    .forEach(suggestion => applyAssignment(suggestion))
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Best Matches
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}