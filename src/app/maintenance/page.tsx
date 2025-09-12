// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Wrench, Calendar, Clock, AlertTriangle, CheckCircle, Settings, Package, TrendingUp, Plus, Search, Filter, Activity } from 'lucide-react'

interface MaintenanceTask {
  id: string
  taskNo: string
  equipmentType: string
  equipmentId?: string
  taskType: 'SCHEDULED' | 'BREAKDOWN' | 'INSPECTION' | 'UPGRADE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  title: string
  description?: string
  dueDate?: string
  scheduledDate?: string
  assignedTo?: string
  estimatedHours?: number
  actualHours?: number
  partsCost?: number
  laborCost?: number
  completedAt?: string
  created_at: string
}

interface MaintenanceSchedule {
  id: string
  equipmentType: string
  scheduleName: string
  frequency: string
  lastCompletedDate?: string
  nextDueDate?: string
  is_active: boolean
}

interface EquipmentDowntime {
  id: string
  equipmentType: string
  equipmentId?: string
  downtimeStart: string
  downtimeEnd?: string
  durationMinutes?: number
  reasonCategory: string
  reasonDetails?: string
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  productionLoss?: number
  resolved: boolean
}

export default function MaintenancePage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [downtime, setDowntime] = useState<EquipmentDowntime[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    equipmentType: 'all',
    taskType: 'all'
  })

  useEffect(() => {
    fetchMaintenanceData()
  }, [])

  const fetchMaintenanceData = async () => {
    setLoading(true)
    try {
      const [tasksRes, schedulesRes, downtimeRes] = await Promise.all([
        fetch('/api/maintenance/tasks?workspace_id=default'),
        fetch('/api/maintenance/schedules?workspace_id=default'),
        fetch('/api/maintenance/downtime?workspace_id=default')
      ])

      const tasksData = await tasksRes.json()
      const schedulesData = await schedulesRes.json()
      const downtimeData = await downtimeRes.json()

      setTasks(tasksData.success ? tasksData.tasks : [])
      setSchedules(schedulesData.success ? schedulesData.schedules : [])
      setDowntime(downtimeData.success ? downtimeData.downtime : [])
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'SCHEDULED': return <Calendar className="h-4 w-4" />
      case 'BREAKDOWN': return <AlertTriangle className="h-4 w-4" />
      case 'INSPECTION': return <Search className="h-4 w-4" />
      case 'UPGRADE': return <TrendingUp className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.equipmentType !== 'all' && task.equipmentType !== filters.equipmentType) return false
    if (filters.taskType !== 'all' && task.taskType !== filters.taskType) return false
    return true
  })

  // Calculate summary metrics
  const taskSummary = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length
  }

  const activeDowytime = downtime.filter(d => !d.resolved).length
  const totalDowntimeToday = downtime
    .filter(d => new Date(d.downtimeStart).toDateString() === new Date().toDateString())
    .reduce((sum, d) => sum + (d.durationMinutes || 0), 0)

  if (loading) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen relative flex items-center justify-center">
          <div className="text-center">
            <div className="cyber-loader mx-auto mb-4"></div>
            <p className="text-cyan-300">Loading maintenance system...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="Maintenance">
                Maintenance
              </h1>
              <p className="text-cyan-300 text-lg">Neural equipment maintenance and work order management</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-white">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="neon-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Task</DialogTitle>
                <DialogDescription>
                  Create a new maintenance work order or scheduled task.
                </DialogDescription>
              </DialogHeader>
              {/* Task creation form would go here */}
              <div className="space-y-4">
                <Input placeholder="Task title" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEWING_MACHINE">Sewing Machine</SelectItem>
                    <SelectItem value="EMBROIDERY">Embroidery Machine</SelectItem>
                    <SelectItem value="HEAT_PRESS">Heat Press</SelectItem>
                    <SelectItem value="CUTTING">Cutting Equipment</SelectItem>
                    <SelectItem value="FACILITY">Facility</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled Maintenance</SelectItem>
                    <SelectItem value="BREAKDOWN">Breakdown Repair</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="UPGRADE">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Task</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskSummary.pending + taskSummary.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {taskSummary.overdue} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => 
                t.completedAt && 
                new Date(t.completedAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {taskSummary.completed} total completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDowytime}</div>
            <p className="text-xs text-muted-foreground">
              Active downtime events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downtime Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalDowntimeToday / 60)}h {totalDowntimeToday % 60}m</div>
            <p className="text-xs text-muted-foreground">
              Total downtime hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Work Orders</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="downtime">Equipment Status</TabsTrigger>
          <TabsTrigger value="parts">Parts & Inventory</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.equipmentType} onValueChange={(value) => setFilters({...filters, equipmentType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    <SelectItem value="SEWING_MACHINE">Sewing Machine</SelectItem>
                    <SelectItem value="EMBROIDERY">Embroidery</SelectItem>
                    <SelectItem value="HEAT_PRESS">Heat Press</SelectItem>
                    <SelectItem value="CUTTING">Cutting</SelectItem>
                    <SelectItem value="FACILITY">Facility</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.taskType} onValueChange={(value) => setFilters({...filters, taskType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="UPGRADE">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="grid gap-4">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance tasks found</h3>
                    <p className="text-gray-500">Create your first maintenance task to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getTaskTypeIcon(task.taskType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{task.title}</h3>
                            <Badge variant="secondary">{task.taskNo}</Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span><strong>Equipment:</strong> {task.equipmentType.replace('_', ' ')}</span>
                              {task.equipmentId && <span><strong>ID:</strong> {task.equipmentId}</span>}
                              <span><strong>Type:</strong> {task.taskType}</span>
                            </div>
                            
                            {task.description && (
                              <p className="text-gray-700 mt-2">{task.description}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 mt-2">
                              {task.dueDate && (
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.assignedTo && (
                                <span><strong>Assigned:</strong> {task.assignedTo}</span>
                              )}
                              {task.estimatedHours && (
                                <span><strong>Est. Hours:</strong> {task.estimatedHours}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        {task.status === 'PENDING' && (
                          <Button size="sm">
                            Start
                          </Button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <Button size="sm">
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Other tabs would be implemented similarly */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedules</CardTitle>
              <CardDescription>Preventive maintenance scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">Maintenance schedules management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downtime">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Status</CardTitle>
              <CardDescription>Real-time equipment status and downtime tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">Equipment status dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <CardTitle>Parts & Inventory</CardTitle>
              <CardDescription>Maintenance parts and consumables inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">Parts inventory management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}