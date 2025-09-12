// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar,
  Target,
  TrendingUp,
  Award,
  Activity,
  ArrowRight,
  Timer,
  Star,
  Zap,
  ArrowUp
} from "lucide-react"
// Temporarily remove AnimatedCounter import to avoid dependency issues
// import { AnimatedCounter } from "@/components/ui/animated-counter"

interface StaffTask {
  id: string
  title: string
  description: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  dueDate: string
  estimatedHours: number
  completedHours: number
  orderNumber?: string
  department: string
}

interface StaffMetrics {
  tasksAssigned: number
  tasksCompleted: number
  tasksInProgress: number
  productivityScore: number
  completionRate: number
  averageRating: number
  hoursWorked: number
  targetHours: number
}

export function StaffDashboard() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<StaffTask[]>([])
  const [metrics, setMetrics] = useState<StaffMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock staff-specific data based on role
    const generateStaffData = () => {
      const userRole = session?.user?.role

      // Mock tasks based on user role
      const mockTasks: StaffTask[] = {
        "GRAPHIC_ARTIST": [
          {
            id: "1",
            title: "Design Corporate Logo",
            description: "Create logo design for Maxicare corporate client",
            priority: "HIGH",
            status: "IN_PROGRESS", 
            dueDate: "2025-09-03",
            estimatedHours: 8,
            completedHours: 4,
            orderNumber: "CORP-2024-001",
            department: "Design"
          },
          {
            id: "2", 
            title: "Hoodie Mockup Design",
            description: "Design mockup for 75pcs premium hoodies",
            priority: "MEDIUM",
            status: "PENDING",
            dueDate: "2025-09-04",
            estimatedHours: 6,
            completedHours: 0,
            orderNumber: "REEF-2024-001487",
            department: "Design"
          },
          {
            id: "3",
            title: "T-shirt Design v2",
            description: "Revision for university shirt design",
            priority: "LOW", 
            status: "COMPLETED",
            dueDate: "2025-09-02",
            estimatedHours: 4,
            completedHours: 4,
            orderNumber: "UNIV-2024-089",
            department: "Design"
          }
        ],
        "DTF_OPERATOR": [
          {
            id: "1",
            title: "DTF Print Batch B-7823",
            description: "Print 150 DTF transfers for hoodie order",
            priority: "HIGH",
            status: "IN_PROGRESS",
            dueDate: "2025-09-03",
            estimatedHours: 6,
            completedHours: 2,
            orderNumber: "REEF-2024-001487",
            department: "Production"
          },
          {
            id: "2",
            title: "Quality Check DTF Films",
            description: "Inspect 200 DTF transfers for defects",
            priority: "MEDIUM", 
            status: "PENDING",
            dueDate: "2025-09-04",
            estimatedHours: 3,
            completedHours: 0,
            orderNumber: "BULK-2024-456",
            department: "QC"
          }
        ],
        "SEWING_OPERATOR": [
          {
            id: "1",
            title: "Sew Premium Hoodies",
            description: "Complete sewing for 75pcs premium hoodies",
            priority: "HIGH",
            status: "PENDING",
            dueDate: "2025-09-05",
            estimatedHours: 12,
            completedHours: 0,
            orderNumber: "REEF-2024-001487", 
            department: "Sewing"
          },
          {
            id: "2",
            title: "Quality Stitch Check",
            description: "Inspect completed garments for stitch quality",
            priority: "MEDIUM",
            status: "IN_PROGRESS",
            dueDate: "2025-09-03",
            estimatedHours: 4,
            completedHours: 2,
            orderNumber: "UNIV-2024-089",
            department: "QC"
          }
        ]
      }[userRole] || []

      // Mock metrics based on role
      const mockMetrics: StaffMetrics = {
        tasksAssigned: mockTasks.length,
        tasksCompleted: mockTasks.filter(t => t.status === "COMPLETED").length,
        tasksInProgress: mockTasks.filter(t => t.status === "IN_PROGRESS").length, 
        productivityScore: 92,
        completionRate: 85,
        averageRating: 4.8,
        hoursWorked: 38,
        targetHours: 40
      }

      setTasks(mockTasks)
      setMetrics(mockMetrics)
      setLoading(false)
    }

    generateStaffData()
  }, [session])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-500 text-white"
      case "MEDIUM": return "bg-yellow-500 text-white" 
      case "LOW": return "bg-green-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "text-green-600 bg-green-50"
      case "IN_PROGRESS": return "text-blue-600 bg-blue-50"
      case "PENDING": return "text-orange-600 bg-orange-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4" />
      case "IN_PROGRESS": return <Clock className="h-4 w-4" />
      case "PENDING": return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
            Live Data
          </Badge>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Tasks Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                All View
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL ORDERS</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.tasksAssigned || 0}
                </p>
                <div className="flex items-center text-green-600 text-sm">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span>{metrics?.tasksCompleted || 0} completed</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {metrics?.tasksInProgress || 0} In progress • {metrics?.tasksAssigned - (metrics?.tasksCompleted || 0) - (metrics?.tasksInProgress || 0)} pending
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Items Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                Inventory
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">INVENTORY ITEMS</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  245
                </p>
                <p className="text-sm text-gray-500">Active inventory items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800">
                ₱ +7.1%
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">MONTHLY REVENUE</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  ₱45,000
                </p>
                <p className="text-sm text-gray-500">This month's earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Timer className="h-5 w-5 text-blue-600" />
              <span>Weekly Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 text-gray-600">
                  <span>Hours Worked</span>
                  <span>{metrics?.hoursWorked}h / {metrics?.targetHours}h</span>
                </div>
                <Progress 
                  value={((metrics?.hoursWorked || 0) / (metrics?.targetHours || 40)) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2 text-gray-600">
                  <span>Task Completion</span>
                  <span>{metrics?.completionRate}%</span>
                </div>
                <Progress value={metrics?.completionRate || 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Award className="h-5 w-5 text-purple-600" />
              <span>Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{metrics?.tasksCompleted}</p>
                <p className="text-sm text-green-700 font-medium">Tasks Done</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{metrics?.tasksInProgress}</p>
                <p className="text-sm text-blue-700 font-medium">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Zap className="h-5 w-5 text-orange-600" />
              <span>My Assigned Tasks</span>
            </CardTitle>
            <Badge className="bg-orange-50 text-orange-600 border-orange-200 px-3 py-1">
              {tasks.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-gray-200 transition-all bg-gray-50/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="font-semibold text-gray-900 text-base">{task.title}</h3>
                      <Badge className={getPriorityColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(task.status)} size="sm">
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{task.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                    {task.orderNumber && (
                      <p className="text-blue-600 text-sm font-medium">
                        Order: {task.orderNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{task.completedHours}h / {task.estimatedHours}h</span>
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline" className="hover:bg-blue-50 border-gray-300">
                    <span className="mr-1">View Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Progress bar for task completion */}
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-2 font-medium">
                    <span>Progress</span>
                    <span>{Math.round((task.completedHours / task.estimatedHours) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(task.completedHours / task.estimatedHours) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}