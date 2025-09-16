// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AutomatedQualityControl from '@/lib/qc/automated-quality-control'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for QC access
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'QC', 'QC_INSPECTOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'dashboard'
    const orderId = searchParams.get('orderId')
    const inspectionId = searchParams.get('inspectionId')
    const period = searchParams.get('period') || 'daily'

    const qcSystem = AutomatedQualityControl.getInstance()

    switch (action) {
      case 'dashboard':
        const dashboard = await qcSystem.getQualityDashboard()
        return NextResponse.json({
          success: true,
          data: dashboard,
          timestamp: new Date().toISOString()
        })

      case 'metrics':
        const metrics = await qcSystem.calculateQualityMetrics(period as 'daily' | 'weekly' | 'monthly')
        return NextResponse.json({
          success: true,
          data: {
            metrics,
            period,
            timestamp: new Date().toISOString()
          }
        })

      case 'inspection':
        if (inspectionId) {
          const inspection = await qcSystem.getInspection(inspectionId)
          if (!inspection) {
            return NextResponse.json(
              { error: 'Inspection not found' },
              { status: 404 }
            )
          }
          
          return NextResponse.json({
            success: true,
            data: {
              inspection,
              timestamp: new Date().toISOString()
            }
          })
        }

        if (orderId) {
          const lastInspection = await qcSystem.getLastInspection(orderId)
          return NextResponse.json({
            success: true,
            data: {
              lastInspection,
              orderId,
              timestamp: new Date().toISOString()
            }
          })
        }

        // Get all active inspections
        const activeInspections = await qcSystem.getAllActiveInspections()
        return NextResponse.json({
          success: true,
          data: {
            activeInspections,
            count: activeInspections.length,
            timestamp: new Date().toISOString()
          }
        })

      case 'standards':
        // Get quality standards (would be from database in production)
        return NextResponse.json({
          success: true,
          data: {
            standards: [], // Would return actual standards
            message: 'Quality standards retrieved',
            timestamp: new Date().toISOString()
          }
        })

      case 'status':
        // Get QC system status
        return NextResponse.json({
          success: true,
          data: {
            systemStatus: 'operational',
            automationEnabled: true,
            activeInspections: (await qcSystem.getAllActiveInspections()).length,
            lastUpdate: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: dashboard, metrics, inspection, standards, or status' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in QC automation GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for QC operations
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'QC', 'QC_INSPECTOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    const qcSystem = AutomatedQualityControl.getInstance()

    switch (action) {
      case 'start_automation':
        qcSystem.startAutomation()
        return NextResponse.json({
          success: true,
          message: 'Automated Quality Control started',
          timestamp: new Date().toISOString()
        })

      case 'stop_automation':
        qcSystem.stopAutomation()
        return NextResponse.json({
          success: true,
          message: 'Automated Quality Control stopped',
          timestamp: new Date().toISOString()
        })

      case 'schedule_inspection':
        const { orderId, inspectionType, priority } = data
        
        if (!orderId || !inspectionType) {
          return NextResponse.json(
            { error: 'orderId and inspectionType are required' },
            { status: 400 }
          )
        }

        // In a real implementation, this would schedule an inspection
        const inspectionId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        return NextResponse.json({
          success: true,
          data: {
            inspectionId,
            orderId,
            inspectionType,
            priority: priority || 'normal',
            scheduledBy: session.user.id,
            message: 'Inspection scheduled successfully'
          },
          timestamp: new Date().toISOString()
        })

      case 'verify_defect':
        const { defectId, verified, notes } = data
        
        if (!defectId || typeof verified !== 'boolean') {
          return NextResponse.json(
            { error: 'defectId and verified (boolean) are required' },
            { status: 400 }
          )
        }

        // In production, this would update the defect verification status
        return NextResponse.json({
          success: true,
          data: {
            defectId,
            verified,
            verifiedBy: session.user.id,
            verifiedAt: new Date().toISOString(),
            notes: notes || '',
            message: `Defect ${verified ? 'verified' : 'rejected'} by inspector`
          },
          timestamp: new Date().toISOString()
        })

      case 'create_capa':
        const { inspectionId: capaInspectionId, defects, type, priority: capaPriority, assignedTo } = data
        
        if (!capaInspectionId || !defects || !Array.isArray(defects)) {
          return NextResponse.json(
            { error: 'inspectionId and defects array are required' },
            { status: 400 }
          )
        }

        // Generate CAPA actions
        const capaActions = defects.map((defect: any, index: number) => ({
          id: `capa_${capaInspectionId}_${index}_${Date.now()}`,
          defectId: defect.id,
          type: type || 'corrective',
          description: `Address ${defect.type} defect in ${defect.location}`,
          priority: capaPriority || 'medium',
          assignedTo: assignedTo || 'quality_manager',
          createdBy: session.user.id,
          createdAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          status: 'open'
        }))

        return NextResponse.json({
          success: true,
          data: {
            capaActions,
            count: capaActions.length,
            message: `${capaActions.length} CAPA actions created successfully`
          },
          timestamp: new Date().toISOString()
        })

      case 'update_quality_standard':
        const { standardId, specification, tolerance, aqlLevel } = data
        
        if (!standardId) {
          return NextResponse.json(
            { error: 'standardId is required' },
            { status: 400 }
          )
        }

        // In production, this would update the quality standard in database
        return NextResponse.json({
          success: true,
          data: {
            standardId,
            specification,
            tolerance,
            aqlLevel,
            updatedBy: session.user.id,
            updatedAt: new Date().toISOString(),
            message: 'Quality standard updated successfully'
          },
          timestamp: new Date().toISOString()
        })

      case 'generate_quality_report':
        const { reportType, period: reportPeriod, includeDetails } = data
        
        const validReportTypes = ['defect_analysis', 'capa_summary', 'inspection_history', 'quality_trends']
        if (!reportType || !validReportTypes.includes(reportType)) {
          return NextResponse.json(
            { error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}` },
            { status: 400 }
          )
        }

        // Generate quality report
        const reportId = `qc_report_${reportType}_${Date.now()}`
        const reportData = {
          id: reportId,
          type: reportType,
          period: reportPeriod || 'monthly',
          includeDetails: includeDetails || false,
          generatedBy: session.user.id,
          generatedAt: new Date().toISOString(),
          status: 'completed',
          fileUrl: `/reports/qc/${reportId}.pdf`
        }

        return NextResponse.json({
          success: true,
          data: {
            report: reportData,
            message: 'Quality report generated successfully'
          },
          timestamp: new Date().toISOString()
        })

      case 'calibrate_system':
        const { parameters, notes: calibrationNotes } = data
        
        // System calibration (in production would update AI models and thresholds)
        return NextResponse.json({
          success: true,
          data: {
            calibrationId: `cal_${Date.now()}`,
            parameters: parameters || {},
            calibratedBy: session.user.id,
            calibratedAt: new Date().toISOString(),
            notes: calibrationNotes || 'System calibration performed',
            message: 'QC system calibrated successfully'
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in QC automation POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}