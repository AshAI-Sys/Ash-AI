// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  Clock, 
  Calendar, 
  User, 
  MapPin, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Utensils,
  Play,
  Pause,
  Square,
  Timer,
  TrendingUp
} from 'lucide-react'

interface TimeEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  clockIn?: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  lunchStart?: string
  lunchEnd?: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_BREAK' | 'ON_LUNCH' | 'CLOCKED_OUT'
  notes?: string
  location?: string
}

interface Employee {
  id: string
  employeeId: string
  name: string
  department: string
  position: string
  shift: {
    start: string
    end: string
    breakDuration: number
    lunchDuration: number
  }
}

interface TimeTrackingModalProps {
  onTimeEntryCreate?: (entry: TimeEntry) => void
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP24010001',
    name: 'Maria Santos',
    department: 'Production',
    position: 'Machine Operator',
    shift: { start: '08:00', end: '17:00', breakDuration: 15, lunchDuration: 60 }
  },
  {
    id: '2',
    employeeId: 'EMP24010002',
    name: 'Juan Cruz',
    department: 'Design',
    position: 'Graphic Designer',
    shift: { start: '09:00', end: '18:00', breakDuration: 15, lunchDuration: 60 }
  },
  {
    id: '3',
    employeeId: 'EMP24010003',
    name: 'Anna Reyes',
    department: 'Quality Control',
    position: 'QC Inspector',
    shift: { start: '07:00', end: '16:00', breakDuration: 15, lunchDuration: 60 }
  }
]

export function TimeTrackingModal({ onTimeEntryCreate }: TimeTrackingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeEntry, setActiveEntry] = useState<Partial<TimeEntry>>({
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0
  })
  const [isLive, setIsLive] = useState(false)

  // Update current time every second when modal is open and live tracking
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isOpen && isLive) {
      interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isOpen, isLive])

  const formatTime = (time: Date | string) => {
    const date = typeof time === 'string' ? new Date(time) : time
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const calculateHours = (start: string, end: string) => {
    const startTime = new Date(`2000-01-01T${start}:00`)
    const endTime = new Date(`2000-01-01T${end}:00`)
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  }

  const calculateTotalHours = (entry: Partial<TimeEntry>) => {
    if (!entry.clockIn || !entry.clockOut) return { total: 0, regular: 0, overtime: 0 }
    
    const totalWorked = calculateHours(entry.clockIn, entry.clockOut)
    let breakTime = 0
    
    if (entry.breakStart && entry.breakEnd) {
      breakTime += calculateHours(entry.breakStart, entry.breakEnd)
    }
    if (entry.lunchStart && entry.lunchEnd) {
      breakTime += calculateHours(entry.lunchStart, entry.lunchEnd)
    }
    
    const netHours = totalWorked - breakTime
    const regular = Math.min(netHours, 8)
    const overtime = Math.max(netHours - 8, 0)
    
    return { total: netHours, regular, overtime }
  }

  const clockIn = () => {
    const now = formatTime(currentTime)
    const updated = { ...activeEntry, clockIn: now, status: 'PRESENT' as const }
    setActiveEntry(updated)
    setIsLive(true)
  }

  const clockOut = () => {
    const now = formatTime(currentTime)
    const updated = { ...activeEntry, clockOut: now, status: 'CLOCKED_OUT' as const }
    const hours = calculateTotalHours(updated)
    updated.totalHours = hours.total
    updated.regularHours = hours.regular
    updated.overtimeHours = hours.overtime
    setActiveEntry(updated)
    setIsLive(false)
  }

  const startBreak = () => {
    const now = formatTime(currentTime)
    setActiveEntry(prev => ({ ...prev, breakStart: now, status: 'ON_BREAK' }))
  }

  const endBreak = () => {
    const now = formatTime(currentTime)
    setActiveEntry(prev => ({ ...prev, breakEnd: now, status: 'PRESENT' }))
  }

  const startLunch = () => {
    const now = formatTime(currentTime)
    setActiveEntry(prev => ({ ...prev, lunchStart: now, status: 'ON_LUNCH' }))
  }

  const endLunch = () => {
    const now = formatTime(currentTime)
    setActiveEntry(prev => ({ ...prev, lunchEnd: now, status: 'PRESENT' }))
  }

  const handleSubmit = () => {
    if (!selectedEmployee || !activeEntry.clockIn) return

    const entry: TimeEntry = {
      id: `time_${Date.now()}`,
      employeeId: selectedEmployee.employeeId,
      employeeName: selectedEmployee.name,
      date: activeEntry.date!,
      clockIn: activeEntry.clockIn,
      clockOut: activeEntry.clockOut,
      breakStart: activeEntry.breakStart,
      breakEnd: activeEntry.breakEnd,
      lunchStart: activeEntry.lunchStart,
      lunchEnd: activeEntry.lunchEnd,
      totalHours: activeEntry.totalHours || 0,
      regularHours: activeEntry.regularHours || 0,
      overtimeHours: activeEntry.overtimeHours || 0,
      status: activeEntry.status || 'PRESENT',
      notes: activeEntry.notes,
      location: activeEntry.location
    }

    onTimeEntryCreate?.(entry)
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setSelectedEmployee(null)
    setActiveEntry({
      date: new Date().toISOString().split('T')[0],
      status: 'PRESENT',
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0
    })
    setIsLive(false)
  }

  const statusColors = {
    PRESENT: 'bg-green-100 text-green-800',
    LATE: 'bg-yellow-100 text-yellow-800',
    ABSENT: 'bg-red-100 text-red-800',
    ON_BREAK: 'bg-blue-100 text-blue-800',
    ON_LUNCH: 'bg-purple-100 text-purple-800',
    CLOCKED_OUT: 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Clock className="mr-2 h-4 w-4" />
          Time Tracker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Employee Time Tracking</span>
          </DialogTitle>
          <DialogDescription>
            Track employee work hours, breaks, and attendance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Time Display */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-blue-600">
                  {formatTime(currentTime)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                {isLive && (
                  <Badge className="mt-2 bg-green-600">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span>LIVE TRACKING</span>
                    </div>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee Selection */}
          <div>
            <Label htmlFor="employee">Select Employee</Label>
            <select
              id="employee"
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const emp = mockEmployees.find(emp => emp.id === e.target.value)
                setSelectedEmployee(emp || null)
                if (emp) {
                  setActiveEntry(prev => ({ 
                    ...prev, 
                    employeeId: emp.employeeId,
                    employeeName: emp.name 
                  }))
                }
              }}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="">Choose employee...</option>
              {mockEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.department} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <>
              {/* Employee Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{selectedEmployee.name}</span>
                    <Badge className={statusColors[activeEntry.status || 'PRESENT']}>
                      {(activeEntry.status || 'PRESENT').replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="font-medium">Department:</span> {selectedEmployee.department}</p>
                      <p><span className="font-medium">Position:</span> {selectedEmployee.position}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Shift:</span> {selectedEmployee.shift.start} - {selectedEmployee.shift.end}</p>
                      <p><span className="font-medium">Break:</span> {selectedEmployee.shift.breakDuration}min, Lunch: {selectedEmployee.shift.lunchDuration}min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Controls */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Clock In/Out</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex space-x-2">
                      <Button 
                        onClick={clockIn} 
                        disabled={!!activeEntry.clockIn || isLive}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Clock In
                      </Button>
                      <Button 
                        onClick={clockOut} 
                        disabled={!activeEntry.clockIn || !!activeEntry.clockOut}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Clock Out
                      </Button>
                    </div>
                    {activeEntry.clockIn && (
                      <div className="text-sm space-y-1">
                        <p>Clock In: <span className="font-mono">{activeEntry.clockIn}</span></p>
                        {activeEntry.clockOut && (
                          <p>Clock Out: <span className="font-mono">{activeEntry.clockOut}</span></p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Coffee className="h-4 w-4" />
                      <span>Break & Lunch</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex space-x-2">
                      <Button 
                        onClick={activeEntry.breakStart && !activeEntry.breakEnd ? endBreak : startBreak}
                        disabled={!activeEntry.clockIn || !!activeEntry.clockOut || activeEntry.status === 'ON_LUNCH'}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Coffee className="mr-1 h-3 w-3" />
                        {activeEntry.breakStart && !activeEntry.breakEnd ? 'End' : 'Start'} Break
                      </Button>
                      <Button 
                        onClick={activeEntry.lunchStart && !activeEntry.lunchEnd ? endLunch : startLunch}
                        disabled={!activeEntry.clockIn || !!activeEntry.clockOut || activeEntry.status === 'ON_BREAK'}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Utensils className="mr-1 h-3 w-3" />
                        {activeEntry.lunchStart && !activeEntry.lunchEnd ? 'End' : 'Start'} Lunch
                      </Button>
                    </div>
                    <div className="text-xs space-y-1">
                      {activeEntry.breakStart && (
                        <p>Break: {activeEntry.breakStart} {activeEntry.breakEnd && `- ${activeEntry.breakEnd}`}</p>
                      )}
                      {activeEntry.lunchStart && (
                        <p>Lunch: {activeEntry.lunchStart} {activeEntry.lunchEnd && `- ${activeEntry.lunchEnd}`}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Hours Summary */}
              {activeEntry.clockOut && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Hours Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{activeEntry.totalHours.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Total Hours</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{activeEntry.regularHours.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Regular Hours</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{activeEntry.overtimeHours.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Overtime Hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={activeEntry.location || ''}
                    onChange={(e) => setActiveEntry(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Work location"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={activeEntry.date}
                    onChange={(e) => setActiveEntry(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={activeEntry.notes || ''}
                  onChange={(e) => setActiveEntry(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md min-h-[80px]"
                  placeholder="Additional notes about today's work..."
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={!selectedEmployee || !activeEntry.clockIn}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Save Time Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}