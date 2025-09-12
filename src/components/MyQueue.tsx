// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Package,
  Timer,
  RefreshCw,
  FileText,
  Camera,
  Scissors,
  Paintbrush,
  Truck,
  ClipboardCheck
} from 'lucide-react'
import { Role, TaskStatus } from '@prisma/client'

interface Task {
  id: string
  title: string
  order_id: string
  step: string
  task_type: string
  status: TaskStatus
  priority: number
  due_at?: Date
  started_at?: Date
  estimated_hours?: number
  notes?: string
  order: {
    po_no: string
    client: string
    design_name: string
    brand: {
      name: string
      code: string
    }
    deadline?: Date
    process_type: string
  }
}

interface MyQueueProps {
  userRole: Role
}

const getRoleIcon = (role: Role) => {
  switch (role) {
    case Role.GRAPHIC_ARTIST: return <Paintbrush className="w-5 h-5" />
    case Role.SCREEN_MAKING: return <FileText className="w-5 h-5" />
    case Role.SILKSCREEN_OPERATOR: 
    case Role.DTF_OPERATOR: 
    case Role.SUBLIMATION_OPERATOR: 
    case Role.EMBROIDERY_OPERATOR: return <Paintbrush className="w-5 h-5" />
    case Role.CUTTING_OPERATOR: return <Scissors className="w-5 h-5" />
    case Role.SEWING_OPERATOR: return <Package className="w-5 h-5" />
    case Role.QC_INSPECTOR: return <ClipboardCheck className="w-5 h-5" />
    case Role.FINISHING_STAFF: return <Package className="w-5 h-5" />
    case Role.DRIVER: return <Truck className="w-5 h-5" />
    default: return <User className="w-5 h-5" />
  }
}

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-300'
    case TaskStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-300'
    case TaskStatus.REJECTED: return 'bg-red-100 text-red-800 border-red-300'
    case TaskStatus.PAUSED: return 'bg-orange-100 text-orange-800 border-orange-300'
    case TaskStatus.ON_HOLD: return 'bg-gray-100 text-gray-800 border-gray-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const getPriorityColor = (priority: number) => {
  if (priority >= 8) return 'bg-red-500'
  if (priority >= 5) return 'bg-orange-500'
  if (priority >= 3) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function MyQueue({ userRole }: MyQueueProps) {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'overdue'>('all')

  useEffect(() => {
    fetchMyTasks()
  }, [filter])

  const fetchMyTasks = async () => {
    try {
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

  const handleTaskAction = async (taskId: string, action: 'start' | 'pause' | 'complete' | 'reject') => {
    if (updating) return
    
    setUpdating(taskId)
    try {
      const body: { action: string; notes?: string } = { action }
      
      if (action === 'reject') {
        const reason = prompt('Please provide a reason for rejection:')
        if (!reason) {
          setUpdating(null)
          return
        }
        body.notes = reason
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await fetchMyTasks() // Refresh the list
      } else {
        console.error('Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdating(null)
    }
  }

  const formatTimeRemaining = (dueDate: Date) => {
    const now = new Date()
    const diff = dueDate.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (diff < 0) return 'OVERDUE'
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  const isOverdue = (dueDate?: Date) => {
    if (!dueDate) return false
    return new Date(dueDate).getTime() < Date.now()
  }

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending': return task.status === TaskStatus.PENDING
      case 'in-progress': return task.status === TaskStatus.IN_PROGRESS
      case 'overdue': return task.due_at && isOverdue(task.due_at)
      default: return true
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading your queue...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getRoleIcon(userRole)}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Queue</h1>
            <p className="text-gray-600">
              {session?.user?.name} - {userRole.replace('_', ' ').toLowerCase()}
            </p>
          </div>
        </div>
        <Button onClick={fetchMyTasks} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'in-progress', 'overdue'] as const).map((filterOption) => (
          <Button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            variant={filter === filterOption ? 'default' : 'outline'}
            size="sm"
            className="capitalize"
          >
            {filterOption.replace('-', ' ')}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
                </p>
              </div>
              <Play className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter(t => t.status === TaskStatus.PENDING).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {tasks.filter(t => t.due_at && isOverdue(t.due_at)).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You don't have any assigned tasks at the moment."
                  : `No ${filter.replace('-', ' ')} tasks available.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={`${isOverdue(task.due_at) ? 'border-red-300 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getStatusColor(task.status)} border`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <div 
                        className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}
                        title={`Priority: ${task.priority}/10`}
                      />
                      <span className="text-sm text-gray-500">
                        {task.order.brand.code} - {task.order.po_no}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{task.title || task.step}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {task.order.client}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {task.order.design_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Paintbrush className="w-4 h-4" />
                          {task.order.process_type}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  {task.due_at && (
                    <div className={`text-right ${isOverdue(task.due_at) ? 'text-red-600' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {isOverdue(task.due_at) ? 'OVERDUE' : formatTimeRemaining(task.due_at)}
                        </span>
                      </div>
                      <div className="text-xs mt-1">
                        Due: {new Date(task.due_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {task.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{task.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {task.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {task.estimated_hours}h estimated
                      </span>
                    )}
                    {task.started_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Started {new Date(task.started_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {task.status === TaskStatus.PENDING && (
                      <Button
                        onClick={() => handleTaskAction(task.id, 'start')}
                        disabled={updating === task.id}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}

                    {task.status === TaskStatus.IN_PROGRESS && (
                      <>
                        <Button
                          onClick={() => handleTaskAction(task.id, 'pause')}
                          disabled={updating === task.id}
                          size="sm"
                          variant="outline"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                        <Button
                          onClick={() => handleTaskAction(task.id, 'complete')}
                          disabled={updating === task.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}

                    {(task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) && (
                      <Button
                        onClick={() => handleTaskAction(task.id, 'reject')}
                        disabled={updating === task.id}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    )}

                    {updating === task.id && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}