// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import WebSocketManager from '@/lib/realtime/websocket-manager'
import { AlertUpdate } from '@/lib/realtime/websocket-manager'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface QualityStandard {
  id: string
  name: string
  category: string
  specification: string
  toleranceMin: number
  toleranceMax: number
  unit: string
  criticalLevel: 'minor' | 'major' | 'critical'
  aqlLevel: number // Acceptable Quality Level
  sampleSize: number
  acceptanceNumber: number
  rejectionNumber: number
}

export interface AutomatedInspection {
  id: string
  orderId: string
  batchId: string
  inspectionType: 'incoming' | 'in_process' | 'final' | 'audit'
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed'
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  inspector?: string
  aiConfidence?: number
  overallResult: 'pass' | 'fail' | 'conditional'
  defectRate: number
  sampleSize: number
  acceptedItems: number
  rejectedItems: number
  defects: QualityDefect[]
  recommendations: string[]
}

export interface QualityDefect {
  id: string
  type: string
  severity: 'minor' | 'major' | 'critical'
  location: string
  description: string
  imageUrl?: string
  aiDetected: boolean
  confidence: number
  inspectorVerified: boolean
  correctiveAction?: string
  preventiveAction?: string
}

export interface CAPAAction {
  id: string
  defectId: string
  type: 'corrective' | 'preventive'
  description: string
  assignedTo: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  dueDate: Date
  completedDate?: Date
  effectiveness: number // 0-100%
  verified: boolean
}

export interface QualityMetrics {
  period: 'daily' | 'weekly' | 'monthly'
  passRate: number
  defectRate: number
  reworkRate: number
  scrapRate: number
  customerComplaintsRate: number
  capeOpenCount: number
  averageResolutionTime: number // hours
  costOfQuality: number // PHP
  qualityTrend: 'improving' | 'stable' | 'declining'
}

class AutomatedQualityControl {
  private static instance: AutomatedQualityControl
  private wsManager: WebSocketManager
  private automationInterval: NodeJS.Timeout | null = null
  private qualityStandards = new Map<string, QualityStandard>()
  private activeInspections = new Map<string, AutomatedInspection>()

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
    this.loadQualityStandards()
  }

  static getInstance(): AutomatedQualityControl {
    if (!AutomatedQualityControl.instance) {
      AutomatedQualityControl.instance = new AutomatedQualityControl()
    }
    return AutomatedQualityControl.instance
  }

  async startAutomation() {
    if (this.automationInterval) {
      clearInterval(this.automationInterval)
    }

    // Run quality automation checks every 2 minutes
    this.automationInterval = setInterval(async () => {
      await this.runAutomatedQualityChecks()
      await this.processScheduledInspections()
      await this.monitorQualityTrends()
      await this.updateQualityMetrics()
    }, 120000)

    console.log('🔍 Automated Quality Control started')
  }

  stopAutomation() {
    if (this.automationInterval) {
      clearInterval(this.automationInterval)
      this.automationInterval = null
    }
    console.log('🔍 Automated Quality Control stopped')
  }

  private async loadQualityStandards() {
    // Load quality standards from database or configuration
    // For demo, using predefined standards
    const standards: QualityStandard[] = [
      {
        id: 'print_quality_1',
        name: 'Print Quality - Color Accuracy',
        category: 'printing',
        specification: 'Color deviation within Delta E < 2.0',
        toleranceMin: 0,
        toleranceMax: 2.0,
        unit: 'Delta E',
        criticalLevel: 'major',
        aqlLevel: 2.5,
        sampleSize: 80,
        acceptanceNumber: 5,
        rejectionNumber: 6
      },
      {
        id: 'sewing_quality_1',
        name: 'Sewing Quality - Stitch Consistency',
        category: 'sewing',
        specification: 'Stitches per inch: 12-14 SPI',
        toleranceMin: 12,
        toleranceMax: 14,
        unit: 'SPI',
        criticalLevel: 'major',
        aqlLevel: 4.0,
        sampleSize: 50,
        acceptanceNumber: 3,
        rejectionNumber: 4
      },
      {
        id: 'material_quality_1',
        name: 'Fabric Weight Consistency',
        category: 'material',
        specification: 'Weight deviation ±5% from specification',
        toleranceMin: -5,
        toleranceMax: 5,
        unit: '%',
        criticalLevel: 'minor',
        aqlLevel: 6.5,
        sampleSize: 32,
        acceptanceNumber: 7,
        rejectionNumber: 8
      }
    ]

    standards.forEach(standard => {
      this.qualityStandards.set(standard.id, standard)
    })
  }

  // Main automation loop
  private async runAutomatedQualityChecks() {
    try {
      // Check for orders that need quality inspection
      const ordersNeedingInspection = await this.identifyOrdersForInspection()
      
      for (const order of ordersNeedingInspection) {
        await this.scheduleAutomatedInspection(order)
      }

      // Process ongoing inspections
      await this.processOngoingInspections()

    } catch (error) {
      console.error('Error in automated quality checks:', error)
    }
  }

  private async identifyOrdersForInspection(): Promise<any[]> {
    // Find orders at quality checkpoints
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'QC' }, // Orders in QC stage
          { 
            routingSteps: {
              some: {
                status: 'DONE',
                workcenter: { in: ['PRINTING', 'SEWING', 'FINISHING'] }
              }
            }
          }
        ]
      },
      include: {
        routingSteps: true,
        orderItems: true
      },
      take: 10 // Process in batches
    })

    // Filter orders that haven't been inspected recently
    const ordersNeedingInspection = []
    for (const order of orders) {
      const lastInspection = await this.getLastInspection(order.id)
      const needsInspection = !lastInspection || 
        (Date.now() - new Date(lastInspection.completedAt || lastInspection.scheduledAt).getTime()) > 4 * 60 * 60 * 1000 // 4 hours

      if (needsInspection) {
        ordersNeedingInspection.push(order)
      }
    }

    return ordersNeedingInspection
  }

  private async scheduleAutomatedInspection(order: any) {
    const inspectionType = this.determineInspectionType(order)
    const batchId = `batch_${order.id}_${Date.now()}`
    
    const inspection: AutomatedInspection = {
      id: `inspection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      batchId,
      inspectionType,
      status: 'scheduled',
      scheduledAt: new Date(),
      overallResult: 'pass', // Will be updated during inspection
      defectRate: 0,
      sampleSize: this.calculateSampleSize(order),
      acceptedItems: 0,
      rejectedItems: 0,
      defects: [],
      recommendations: []
    }

    this.activeInspections.set(inspection.id, inspection)
    
    // Cache for API access
    await redis.setex(`inspection:${inspection.id}`, 3600, JSON.stringify(inspection))
    
    console.log(`🔍 Scheduled automated inspection: ${inspection.id} for order: ${order.po_number}`)
    
    // Start inspection immediately if conditions are met
    await this.startInspection(inspection.id)
  }

  private determineInspectionType(order: any): 'incoming' | 'in_process' | 'final' | 'audit' {
    if (order.status === 'QC') return 'final'
    
    // Check which stage was just completed
    const completedSteps = order.routingSteps.filter((step: any) => step.status === 'DONE')
    const lastCompletedStep = completedSteps.sort((a: any, b: any) => 
      new Date(b.actual_end).getTime() - new Date(a.actual_end).getTime()
    )[0]

    if (lastCompletedStep) {
      switch (lastCompletedStep.workcenter) {
        case 'PRINTING': return 'in_process'
        case 'SEWING': return 'in_process'  
        case 'FINISHING': return 'final'
        default: return 'in_process'
      }
    }

    return 'in_process'
  }

  private calculateSampleSize(order: any): number {
    const totalQuantity = order.total_qty
    
    // AQL sample size calculation based on MIL-STD-105E
    if (totalQuantity <= 90) return Math.min(totalQuantity, 13)
    if (totalQuantity <= 150) return 20
    if (totalQuantity <= 280) return 32
    if (totalQuantity <= 500) return 50
    if (totalQuantity <= 1200) return 80
    if (totalQuantity <= 3200) return 125
    return 200
  }

  private async startInspection(inspectionId: string) {
    const inspection = this.activeInspections.get(inspectionId)
    if (!inspection || inspection.status !== 'scheduled') return

    inspection.status = 'in_progress'
    inspection.startedAt = new Date()

    // Simulate AI-powered quality inspection
    const inspectionResult = await this.performAIInspection(inspection)
    
    // Update inspection with results
    inspection.defects = inspectionResult.defects
    inspection.defectRate = inspectionResult.defectRate
    inspection.acceptedItems = inspectionResult.acceptedItems
    inspection.rejectedItems = inspectionResult.rejectedItems
    inspection.aiConfidence = inspectionResult.confidence
    inspection.overallResult = inspectionResult.overallResult
    inspection.recommendations = inspectionResult.recommendations
    inspection.status = 'completed'
    inspection.completedAt = new Date()

    // Store results in database
    await this.saveInspectionResults(inspection)

    // Generate CAPA actions if needed
    if (inspection.overallResult === 'fail' || inspection.defectRate > 0.05) {
      await this.generateCAPAActions(inspection)
    }

    // Send real-time updates
    await this.broadcastQualityUpdate(inspection)

    console.log(`✅ Completed inspection: ${inspectionId} - Result: ${inspection.overallResult}`)
  }

  private async performAIInspection(inspection: AutomatedInspection): Promise<{
    defects: QualityDefect[]
    defectRate: number
    acceptedItems: number
    rejectedItems: number
    confidence: number
    overallResult: 'pass' | 'fail' | 'conditional'
    recommendations: string[]
  }> {
    // Simulate AI inspection process
    // In production, this would integrate with actual AI vision systems
    
    const sampleSize = inspection.sampleSize
    const defects: QualityDefect[] = []
    let defectCount = 0
    
    // Get applicable quality standards
    const applicableStandards = this.getApplicableStandards(inspection.inspectionType)
    
    // Simulate defect detection for each standard
    for (const standard of applicableStandards) {
      const simulatedDefects = await this.simulateDefectDetection(standard, sampleSize)
      defects.push(...simulatedDefects)
      defectCount += simulatedDefects.length
    }

    const defectRate = defectCount / sampleSize
    const rejectedItems = defectCount
    const acceptedItems = sampleSize - rejectedItems

    // Determine overall result based on AQL standards
    const overallResult = this.determineInspectionResult(defects, applicableStandards)
    
    // Generate AI confidence based on detection patterns
    const confidence = this.calculateAIConfidence(defects)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(defects, defectRate)

    return {
      defects,
      defectRate,
      acceptedItems,
      rejectedItems,
      confidence,
      overallResult,
      recommendations
    }
  }

  private getApplicableStandards(inspectionType: string): QualityStandard[] {
    const standards = Array.from(this.qualityStandards.values())
    
    // Return standards applicable to inspection type
    switch (inspectionType) {
      case 'incoming':
        return standards.filter(s => s.category === 'material')
      case 'in_process':
        return standards.filter(s => ['printing', 'sewing'].includes(s.category))
      case 'final':
        return standards // All standards apply to final inspection
      case 'audit':
        return standards.filter(s => s.criticalLevel === 'critical')
      default:
        return standards
    }
  }

  private async simulateDefectDetection(standard: QualityStandard, sampleSize: number): Promise<QualityDefect[]> {
    const defects: QualityDefect[] = []
    
    // Simulate defect detection based on AQL levels
    const expectedDefects = Math.floor(sampleSize * (standard.aqlLevel / 100))
    const actualDefects = Math.max(0, expectedDefects + Math.floor((Math.random() - 0.7) * 3))
    
    for (let i = 0; i < actualDefects; i++) {
      const defect: QualityDefect = {
        id: `defect_${Date.now()}_${i}`,
        type: this.getDefectTypeByCategory(standard.category),
        severity: this.getRandomSeverity(standard.criticalLevel),
        location: this.getRandomLocation(),
        description: `${standard.name} deviation detected`,
        aiDetected: Math.random() > 0.1, // 90% AI detection rate
        confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
        inspectorVerified: false
      }
      
      defects.push(defect)
    }
    
    return defects
  }

  private getDefectTypeByCategory(category: string): string {
    const defectTypes = {
      'printing': ['color_mismatch', 'registration_error', 'ink_smudge', 'incomplete_print'],
      'sewing': ['stitch_skip', 'thread_break', 'seam_pucker', 'uneven_seam'],
      'material': ['weight_variance', 'width_variance', 'color_variation', 'texture_defect'],
      'finishing': ['incomplete_trim', 'press_mark', 'packaging_error']
    }
    
    const types = defectTypes[category as keyof typeof defectTypes] || ['general_defect']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getRandomSeverity(criticalLevel: string): 'minor' | 'major' | 'critical' {
    if (criticalLevel === 'critical' && Math.random() < 0.3) return 'critical'
    if (Math.random() < 0.6) return 'minor'
    return 'major'
  }

  private getRandomLocation(): string {
    const locations = ['front_panel', 'back_panel', 'sleeve_left', 'sleeve_right', 'collar', 'hem', 'pocket']
    return locations[Math.floor(Math.random() * locations.length)]
  }

  private determineInspectionResult(defects: QualityDefect[], standards: QualityStandard[]): 'pass' | 'fail' | 'conditional' {
    let criticalDefects = 0
    let majorDefects = 0
    let minorDefects = 0

    defects.forEach(defect => {
      switch (defect.severity) {
        case 'critical': criticalDefects++; break
        case 'major': majorDefects++; break
        case 'minor': minorDefects++; break
      }
    })

    // Fail if any critical defects
    if (criticalDefects > 0) return 'fail'

    // Check against AQL standards
    for (const standard of standards) {
      const relevantDefects = defects.filter(d => d.severity === standard.criticalLevel).length
      if (relevantDefects >= standard.rejectionNumber) {
        return 'fail'
      }
    }

    // Conditional if too many major defects
    if (majorDefects > 3) return 'conditional'

    return 'pass'
  }

  private calculateAIConfidence(defects: QualityDefect[]): number {
    if (defects.length === 0) return 0.95

    const avgConfidence = defects.reduce((sum, defect) => sum + defect.confidence, 0) / defects.length
    return Math.round(avgConfidence * 100) / 100
  }

  private generateRecommendations(defects: QualityDefect[], defectRate: number): string[] {
    const recommendations: string[] = []

    if (defectRate > 0.1) {
      recommendations.push('High defect rate detected - review production parameters')
    }

    const defectsByType = defects.reduce((acc, defect) => {
      acc[defect.type] = (acc[defect.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(defectsByType).forEach(([type, count]) => {
      if (count >= 3) {
        recommendations.push(`Recurring ${type} defects - investigate root cause`)
      }
    })

    const criticalDefects = defects.filter(d => d.severity === 'critical').length
    if (criticalDefects > 0) {
      recommendations.push('Critical defects found - immediate corrective action required')
    }

    if (recommendations.length === 0) {
      recommendations.push('Quality within acceptable limits - continue monitoring')
    }

    return recommendations
  }

  private async saveInspectionResults(inspection: AutomatedInspection) {
    try {
      // In production, save to database
      await redis.setex(`inspection:${inspection.id}`, 86400, JSON.stringify(inspection))
      
      // Update inspection history
      await redis.lpush(`inspections:${inspection.orderId}`, JSON.stringify(inspection))
      await redis.ltrim(`inspections:${inspection.orderId}`, 0, 49) // Keep last 50

    } catch (error) {
      console.error('Error saving inspection results:', error)
    }
  }

  private async generateCAPAActions(inspection: AutomatedInspection) {
    const capaActions: CAPAAction[] = []

    for (const defect of inspection.defects.filter(d => d.severity !== 'minor')) {
      // Corrective action
      const correctiveAction: CAPAAction = {
        id: `capa_c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        defectId: defect.id,
        type: 'corrective',
        description: `Address ${defect.type} defect in ${defect.location}`,
        assignedTo: await this.assignCAPAResponsible(defect.type),
        priority: defect.severity === 'critical' ? 'critical' : 'high',
        status: 'open',
        dueDate: new Date(Date.now() + (defect.severity === 'critical' ? 24 : 72) * 60 * 60 * 1000),
        effectiveness: 0,
        verified: false
      }

      // Preventive action
      if (defect.severity === 'major' || defect.severity === 'critical') {
        const preventiveAction: CAPAAction = {
          id: `capa_p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          defectId: defect.id,
          type: 'preventive',
          description: `Implement controls to prevent ${defect.type} defects`,
          assignedTo: await this.assignCAPAResponsible(defect.type),
          priority: 'medium',
          status: 'open',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          effectiveness: 0,
          verified: false
        }

        capaActions.push(preventiveAction)
      }

      capaActions.push(correctiveAction)
    }

    // Save CAPA actions
    for (const capa of capaActions) {
      await redis.setex(`capa:${capa.id}`, 86400 * 30, JSON.stringify(capa)) // 30 days
      await redis.lpush(`capa:open`, JSON.stringify(capa))
    }

    // Send CAPA notifications
    await this.sendCAPANotifications(capaActions)

    console.log(`📋 Generated ${capaActions.length} CAPA actions for inspection ${inspection.id}`)
  }

  private async assignCAPAResponsible(defectType: string): Promise<string> {
    // Simple assignment logic - in production would be more sophisticated
    const assignments = {
      'color_mismatch': 'printing_supervisor',
      'stitch_skip': 'sewing_supervisor', 
      'weight_variance': 'material_manager',
      'default': 'quality_manager'
    }

    return assignments[defectType as keyof typeof assignments] || assignments.default
  }

  private async sendCAPANotifications(capaActions: CAPAAction[]) {
    for (const capa of capaActions) {
      const alert: AlertUpdate = {
        id: `capa_alert_${capa.id}`,
        type: 'quality',
        severity: capa.priority === 'critical' ? 'critical' : 'high',
        title: `CAPA Action Required`,
        message: `${capa.type.toUpperCase()}: ${capa.description}`,
        timestamp: new Date()
      }

      await this.wsManager.broadcastAlert(alert)
    }
  }

  private async processScheduledInspections() {
    // Process inspections that are scheduled but not started
    for (const [id, inspection] of this.activeInspections) {
      if (inspection.status === 'scheduled') {
        // Start inspection if conditions are met
        const shouldStart = Date.now() - inspection.scheduledAt.getTime() > 60000 // 1 minute delay
        if (shouldStart) {
          await this.startInspection(id)
        }
      }
    }
  }

  private async processOngoingInspections() {
    // Check for inspections that have been running too long
    for (const [id, inspection] of this.activeInspections) {
      if (inspection.status === 'in_progress') {
        const runningTime = Date.now() - (inspection.startedAt?.getTime() || 0)
        if (runningTime > 10 * 60 * 1000) { // 10 minutes
          inspection.status = 'failed'
          console.error(`❌ Inspection ${id} failed - timeout`)
        }
      }
    }
  }

  private async monitorQualityTrends() {
    try {
      const metrics = await this.calculateQualityMetrics('daily')
      
      // Check for concerning trends
      if (metrics.defectRate > 0.1) { // More than 10% defect rate
        await this.createQualityAlert('high_defect_rate', metrics.defectRate)
      }

      if (metrics.passRate < 0.9) { // Less than 90% pass rate
        await this.createQualityAlert('low_pass_rate', metrics.passRate)
      }

    } catch (error) {
      console.error('Error monitoring quality trends:', error)
    }
  }

  private async createQualityAlert(type: string, value: number) {
    const alert: AlertUpdate = {
      id: `quality_${type}_${Date.now()}`,
      type: 'quality',
      severity: value > 0.15 || value < 0.85 ? 'critical' : 'high',
      title: `Quality Alert: ${type.replace('_', ' ').toUpperCase()}`,
      message: `Current ${type.replace('_', ' ')}: ${(value * 100).toFixed(1)}%`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
  }

  private async updateQualityMetrics() {
    const metrics = await this.calculateQualityMetrics('daily')
    await redis.setex('quality:metrics:daily', 3600, JSON.stringify(metrics))
  }

  // Public API methods
  async calculateQualityMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<QualityMetrics> {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    // Get completed inspections in period
    const inspections = await this.getInspectionsInPeriod(startDate, now)
    
    if (inspections.length === 0) {
      return {
        period,
        passRate: 1.0,
        defectRate: 0,
        reworkRate: 0,
        scrapRate: 0,
        customerComplaintsRate: 0,
        capeOpenCount: 0,
        averageResolutionTime: 0,
        costOfQuality: 0,
        qualityTrend: 'stable'
      }
    }

    const totalInspections = inspections.length
    const passedInspections = inspections.filter(i => i.overallResult === 'pass').length
    const passRate = passedInspections / totalInspections

    const totalDefects = inspections.reduce((sum, i) => sum + i.defects.length, 0)
    const totalSamples = inspections.reduce((sum, i) => sum + i.sampleSize, 0)
    const defectRate = totalSamples > 0 ? totalDefects / totalSamples : 0

    return {
      period,
      passRate,
      defectRate,
      reworkRate: defectRate * 0.7, // Estimate
      scrapRate: defectRate * 0.3, // Estimate
      customerComplaintsRate: defectRate * 0.05, // Estimate
      capeOpenCount: await this.getOpenCAPACount(),
      averageResolutionTime: await this.getAverageResolutionTime(),
      costOfQuality: await this.calculateCostOfQuality(inspections),
      qualityTrend: await this.determineQualityTrend(period)
    }
  }

  private async getInspectionsInPeriod(startDate: Date, endDate: Date): Promise<AutomatedInspection[]> {
    // In production, query database
    // For now, return from active inspections cache
    return Array.from(this.activeInspections.values()).filter(
      inspection => inspection.completedAt && 
      inspection.completedAt >= startDate && 
      inspection.completedAt <= endDate
    )
  }

  private async getOpenCAPACount(): Promise<number> {
    try {
      const openCAPAs = await redis.llen('capa:open')
      return openCAPAs
    } catch (error) {
      return 0
    }
  }

  private async getAverageResolutionTime(): Promise<number> {
    // Simplified calculation - in production would query actual CAPA data
    return 48 // 48 hours average
  }

  private async calculateCostOfQuality(inspections: AutomatedInspection[]): Promise<number> {
    // Simplified COQ calculation
    const defectCount = inspections.reduce((sum, i) => sum + i.defects.length, 0)
    const avgCostPerDefect = 500 // PHP 500 per defect average
    return defectCount * avgCostPerDefect
  }

  private async determineQualityTrend(period: string): Promise<'improving' | 'stable' | 'declining'> {
    // Compare with previous period
    // Simplified logic for demo
    const currentMetrics = await redis.get(`quality:metrics:${period}`)
    if (!currentMetrics) return 'stable'

    const current = JSON.parse(currentMetrics)
    const trendThreshold = 0.05 // 5% change threshold

    // Simulate trend calculation
    const previousPassRate = current.passRate + (Math.random() - 0.5) * 0.1
    const passRateChange = current.passRate - previousPassRate

    if (passRateChange > trendThreshold) return 'improving'
    if (passRateChange < -trendThreshold) return 'declining'
    return 'stable'
  }

  async getQualityDashboard(): Promise<any> {
    const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
      this.calculateQualityMetrics('daily'),
      this.calculateQualityMetrics('weekly'),
      this.calculateQualityMetrics('monthly')
    ])

    const recentInspections = Array.from(this.activeInspections.values())
      .filter(i => i.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10)

    return {
      metrics: {
        daily: dailyMetrics,
        weekly: weeklyMetrics,
        monthly: monthlyMetrics
      },
      recentInspections,
      activeInspections: Array.from(this.activeInspections.values()).filter(i => i.status === 'in_progress').length,
      qualityStandards: Array.from(this.qualityStandards.values()),
      timestamp: new Date().toISOString()
    }
  }

  async getLastInspection(orderId: string): Promise<AutomatedInspection | null> {
    try {
      const inspections = await redis.lrange(`inspections:${orderId}`, 0, 0)
      return inspections.length > 0 ? JSON.parse(inspections[0]) : null
    } catch (error) {
      return null
    }
  }

  async getInspection(inspectionId: string): Promise<AutomatedInspection | null> {
    const active = this.activeInspections.get(inspectionId)
    if (active) return active

    try {
      const cached = await redis.get(`inspection:${inspectionId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      return null
    }
  }

  async getAllActiveInspections(): Promise<AutomatedInspection[]> {
    return Array.from(this.activeInspections.values())
  }

  private async broadcastQualityUpdate(inspection: AutomatedInspection) {
    // Broadcast quality update via WebSocket
    const update = {
      type: 'quality_inspection',
      data: {
        inspectionId: inspection.id,
        orderId: inspection.orderId,
        result: inspection.overallResult,
        defectRate: inspection.defectRate,
        defectCount: inspection.defects.length,
        timestamp: new Date().toISOString()
      }
    }

    // This would be sent via WebSocket to connected clients
    console.log('📡 Quality update broadcasted:', update)
  }
}

export default AutomatedQualityControl