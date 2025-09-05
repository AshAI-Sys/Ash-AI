'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Package,
  Timer,
  RefreshCw,
  Plus,
  MessageSquare,
  Camera,
  ArrowRight
} from 'lucide-react'
import { TaskStatus } from '@prisma/client'

interface MobileTask {
  id: string
  title: string
  order: {
    po_no: string
    client: string
    design_name: string
    brand: { name: string }
  }
  status: TaskStatus
  priority: number
  due_at?: Date
  started_at?: Date
  estimated_hours?: number
  notes?: string
}

interface MobileTaskQueueProps {
  userRole?: string
}

export function MobileTaskQueue({ userRole }: MobileTaskQueueProps) {
  const [tasks, setTasks] = useState<MobileTask[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'overdue'>('active')
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-queue?filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const updateTaskStatus = async (taskId: string, action: string, notes?: string) => {
    try {
      setUpdating(taskId)
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes })
      })
      
      if (response.ok) {
        await fetchTasks() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdating(null)
      setShowNoteInput(null)
      setNewNote('')
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-300'
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-300'
      case TaskStatus.PAUSED: return 'bg-orange-100 text-orange-800 border-orange-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500'
    if (priority >= 5) return 'bg-orange-500'
    if (priority >= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const isOverdue = (dueDate?: Date) => {
    return dueDate && new Date(dueDate) < new Date()
  }

  const formatTimeRemaining = (dueDate?: Date) => {
    if (!dueDate) return null
    
    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    
    if (diffMs < 0) {
      return `${Math.abs(diffHours)}h overdue`
    } else if (diffHours < 24) {
      return `${diffHours}h remaining`
    } else {
      const diffDays = Math.round(diffHours / 24)
      return `${diffDays}d remaining`
    }
  }

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending': return task.status === TaskStatus.PENDING
      case 'active': return task.status === TaskStatus.IN_PROGRESS
      case 'overdue': return isOverdue(task.due_at)
      default: return true
    }
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
            </div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">
              {tasks.filter(t => t.status === TaskStatus.PENDING).length}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {tasks.filter(t => t.status === TaskStatus.COMPLETED).length}
            </div>
            <div className="text-xs text-gray-600">Done</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {tasks.filter(t => isOverdue(t.due_at)).length}
            </div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
        {(['active', 'pending', 'overdue', 'all'] as const).map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              filter === filterOption
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Tasks ({filteredTasks.length})</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchTasks}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 text-sm">
                {filter === 'all' 
                  ? "You don't have any assigned tasks."
                  : `No ${filter} tasks available.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              className={`${isOverdue(task.due_at) ? 'border-red-200 bg-red-50' : ''} relative`}
            >
              <CardContent className="p-4">
                {/* Priority Indicator */}
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                
                {/* Task Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 pr-6">
                      {task.title}
                    </h3>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div><strong>PO:</strong> {task.order.po_no}</div>
                      <div><strong>Client:</strong> {task.order.client}</div>
                      <div><strong>Design:</strong> {task.order.design_name}</div>
                    </div>
                  </div>

                  {/* Status & Time */}
                  <div className="flex items-center justify-between">
                    <Badge className={`text-xs border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.due_at && (
                      <div className={`text-xs flex items-center gap-1 ${
                        isOverdue(task.due_at) ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(task.due_at)}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {task.status === TaskStatus.PENDING && (
                        <Button
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'start')}
                          disabled={updating === task.id}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                        >
                          {updating === task.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </>
                          )}
                        </Button>
                      )}
                      
                      {task.status === TaskStatus.IN_PROGRESS && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatus(task.id, 'pause')}
                            disabled={updating === task.id}
                            className="flex-1"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, 'complete')}
                            disabled={updating === task.id}
                            className="flex-1 bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                        </>
                      )}

                      {task.status === TaskStatus.PAUSED && (
                        <Button
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'resume')}
                          disabled={updating === task.id}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                      )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNoteInput(task.id)}
                        className="flex-1"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Photo
                      </Button>
                    </div>

                    {/* Note Input */}
                    {showNoteInput === task.id && (
                      <div className="space-y-2 pt-2 border-t">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note about this task..."
                          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, 'add_note', newNote)}
                            disabled={!newNote.trim()}
                            className="flex-1"
                          >
                            Save Note
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowNoteInput(null)
                              setNewNote('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Existing Notes */}
                  {task.notes && (
                    <div className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                      <strong>Note:</strong> {task.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}