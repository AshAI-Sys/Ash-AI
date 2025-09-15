// @ts-nocheck
// Database Fallback Handler - Provides mock data when database models don't exist
// This prevents API crashes while the system is being developed

export class DatabaseFallback {
  static async safeQuery<T>(queryFn: () => Promise<T>, fallbackData: T): Promise<T> {
    try {
      return await queryFn()
    } catch (error) {
      console.warn('Database query failed, using fallback data:', error.message)
      return fallbackData
    }
  }

  static async safeAggregate(modelName: string, operation: string, fallbackValue: any) {
    console.warn(`Database model ${modelName} not found, using fallback for ${operation}`)
    return fallbackValue
  }

  static async safeCount(modelName: string, fallbackCount: number = 0) {
    console.warn(`Database model ${modelName} not found, using fallback count: ${fallbackCount}`)
    return fallbackCount
  }

  static async safeFindMany(modelName: string, fallbackArray: any[] = []) {
    console.warn(`Database model ${modelName} not found, using fallback array`)
    return fallbackArray
  }

  // Mock data generators
  static getMockOrderData() {
    return {
      totalOrders: 1247,
      activeOrders: 23,
      completedOrders: 1224,
      overdueOrders: 3,
      monthlyOrders: 145,
      dailyOrders: 8
    }
  }

  static getMockProductionMetrics() {
    return {
      efficiency: 87.5,
      onTimeDelivery: 94.2,
      qualityScore: 96.8,
      throughput: 245,
      trend: 'up',
      stagesInProgress: 12,
      completedToday: 28
    }
  }

  static getMockRevenueData() {
    return {
      total: 2800000,
      monthly: 450000,
      daily: 15000,
      growth: 12.5,
      currency: 'PHP'
    }
  }

  static getMockAlerts() {
    return [
      {
        type: 'warning',
        message: '3 orders approaching deadline',
        count: 3,
        urgency: 'medium'
      },
      {
        type: 'info',
        message: '28 orders completed today',
        count: 28,
        urgency: 'low'
      },
      {
        type: 'success',
        message: '94.2% on-time delivery rate',
        count: 942,
        urgency: 'low'
      }
    ]
  }

  static getMockWorkflowInsights() {
    return {
      bottlenecks: ['QC_INSPECTION', 'CUTTING'],
      averageLeadTime: 7.2,
      stageEfficiency: {
        CUTTING: 92.5,
        PRINTING: 88.3,
        SEWING: 89.7,
        QC: 96.2,
        FINISHING: 91.8
      },
      recommendations: [
        'Optimize QC inspection workflow',
        'Add additional cutting capacity',
        'Improve material flow in sewing'
      ]
    }
  }

  static getMockSecurityMetrics() {
    return {
      overall_score: 94,
      threat_level: 'LOW',
      active_sessions: 12,
      failed_logins: 2,
      suspicious_activities: 0,
      last_updated: new Date().toISOString()
    }
  }
}

// Helper function to wrap Prisma queries with fallback
export function withFallback<T>(queryFn: () => Promise<T>, fallbackData: T): Promise<T> {
  return DatabaseFallback.safeQuery(queryFn, fallbackData)
}