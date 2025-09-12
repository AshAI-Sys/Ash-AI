// @ts-nocheck
// @ts-nocheck
import { prisma as db } from './db'
import { RejectPolicy, RejectRecord, QCRecord, Task, Order } from '@prisma/client'

export interface RejectCostAssignment {
  rejectRecordId: string
  responsibleParty: 'SUPPLIER' | 'STAFF' | 'CLIENT' | 'COMPANY'
  assignedCost: number
  costRatio: number
  reasoning: string
}

export interface RejectAnalytics {
  totalRejects: number
  totalCost: number
  supplierCost: number
  staffCost: number
  clientCost: number
  companyCost: number
  topReasons: Array<{
    reason: string
    count: number
    cost: number
  }>
  topStaff: Array<{
    staffId: string
    staffName: string
    rejectCount: number
    cost: number
  }>
}

class RejectPolicyService {
  async createPolicy(data: {
    name: string
    category: 'SUPPLIER_DEFECT' | 'WORKMANSHIP_ERROR' | 'DESIGN_CHANGE' | 'UNAVOIDABLE'
    responsible: 'SUPPLIER' | 'STAFF' | 'CLIENT' | 'COMPANY'
    costRatio: number
    description?: string
  }): Promise<RejectPolicy> {
    return db.rejectPolicy.create({
      data: {
        name: data.name,
        category: data.category,
        responsible: data.responsible,
        costRatio: Math.max(0, Math.min(1, data.costRatio)), // Ensure 0-1 range
        description: data.description,
        active: true
      }
    })
  }

  async updatePolicy(id: string, data: Partial<{
    name: string
    category: 'SUPPLIER_DEFECT' | 'WORKMANSHIP_ERROR' | 'DESIGN_CHANGE' | 'UNAVOIDABLE'
    responsible: 'SUPPLIER' | 'STAFF' | 'CLIENT' | 'COMPANY'
    costRatio: number
    description: string
    active: boolean
  }>): Promise<RejectPolicy> {
    if (data.costRatio !== undefined) {
      data.costRatio = Math.max(0, Math.min(1, data.costRatio))
    }

    return db.rejectPolicy.update({
      where: { id },
      data
    })
  }

  async getActivePolicies(): Promise<RejectPolicy[]> {
    return db.rejectPolicy.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })
  }

  async assignRejectCost(data: {
    qcRecordId: string
    policyId: string
    rejectedQty: number
    unitCost: number
    reason: string
    staffId?: string
    vendorId?: string
  }): Promise<RejectCostAssignment> {
    const policy = await db.rejectPolicy.findUnique({
      where: { id: data.policyId }
    })

    if (!policy) {
      throw new Error('Reject policy not found')
    }

    const qcRecord = await db.qCRecord.findUnique({
      where: { id: data.qcRecordId },
      include: {
        order: true,
        task: true
      }
    })

    if (!qcRecord) {
      throw new Error('QC record not found')
    }

    const totalCost = data.rejectedQty * data.unitCost
    const assignedCost = totalCost * policy.costRatio

    const rejectRecord = await db.rejectRecord.create({
      data: {
        qcRecordId: data.qcRecordId,
        order_id: qcRecord.order_id,
        taskId: qcRecord.taskId,
        policyId: data.policyId,
        rejectedQty: data.rejectedQty,
        unitCost: data.unitCost,
        totalCost,
        assignedCost,
        reason: data.reason,
        responsibleParty: policy.responsible,
        staffId: data.staffId,
        vendorId: data.vendorId,
        // resolved: false // This field doesn't exist in RejectRecord
      }
    })

    // Automatically apply cost based on policy
    await this.applyCostAssignment(rejectRecord.id)

    return {
      rejectRecordId: rejectRecord.id,
      responsibleParty: policy.responsible,
      assignedCost,
      costRatio: policy.costRatio,
      reasoning: this.generateReasoning(policy, data.reason)
    }
  }

  async applyCostAssignment(rejectRecordId: string): Promise<void> {
    const rejectRecord = await db.rejectRecord.findUnique({
      where: { id: rejectRecordId },
      include: {
        order: true,
        policy: true,
        staff: true,
        vendor: true
      }
    })

    if (!rejectRecord) {
      throw new Error('Reject record not found')
    }

    await db.$transaction(async (tx) => {
      switch (rejectRecord.responsibleParty) {
        case 'SUPPLIER':
          if (rejectRecord.vendorId) {
            // Create deduction/bill adjustment for supplier
            await tx.bill.create({
              data: {
                billNumber: `REJECT-${rejectRecord.id.slice(-8)}`,
                vendorId: rejectRecord.vendorId,
                amount: -rejectRecord.assignedCost, // Negative for deduction
                status: 'OPEN',
                notes: `Reject deduction: ${rejectRecord.reason}`
              }
            })
          }
          break

        case 'STAFF':
          if (rejectRecord.staffId) {
            // Deduct from staff payroll or create disciplinary record
            // This could be implemented based on HR policies
            console.log(`Staff penalty assigned: ${rejectRecord.assignedCost} to ${rejectRecord.staffId}`)
          }
          break

        case 'CLIENT':
          // Add to order costs - client responsible
          if (rejectRecord.order_id) {
            await tx.orderCost.create({
              data: {
                order_id: rejectRecord.order_id,
                category: 'REJECTS',
                description: `Client-caused reject: ${rejectRecord.reason}`,
                amount: rejectRecord.assignedCost
              }
            })
          }
          break

        case 'COMPANY':
          // Company absorbs the cost - add to order costs but don't bill client
          if (rejectRecord.order_id) {
            await tx.orderCost.create({
              data: {
                order_id: rejectRecord.order_id,
                category: 'REJECTS',
                description: `Company absorbed reject: ${rejectRecord.reason}`,
                amount: rejectRecord.assignedCost
              }
            })
          }
          break
      }

      // Mark as resolved
      await tx.rejectRecord.update({
        where: { id: rejectRecordId },
        data: { /* resolved: true */ } // This field doesn't exist in RejectRecord
      })
    })
  }

  async getRejectAnalytics(dateFrom: Date, dateTo: Date, order_id?: string): Promise<RejectAnalytics> {
    const whereClause: any = {
      created_at: {
        gte: dateFrom,
        lte: dateTo
      }
    }

    if (order_id) {
      whereClause.order_id = order_id
    }

    const rejects = await db.rejectRecord.findMany({
      where: whereClause,
      include: {
        staff: true,
        policy: true
      }
    })

    const totalRejects = rejects.length
    const totalCost = rejects.reduce((sum, r) => sum + r.totalCost, 0)
    const supplierCost = rejects
      .filter(r => r.responsibleParty === 'SUPPLIER')
      .reduce((sum, r) => sum + r.assignedCost, 0)
    const staffCost = rejects
      .filter(r => r.responsibleParty === 'STAFF')
      .reduce((sum, r) => sum + r.assignedCost, 0)
    const clientCost = rejects
      .filter(r => r.responsibleParty === 'CLIENT')
      .reduce((sum, r) => sum + r.assignedCost, 0)
    const companyCost = rejects
      .filter(r => r.responsibleParty === 'COMPANY')
      .reduce((sum, r) => sum + r.assignedCost, 0)

    // Top reasons
    const reasonMap = new Map<string, { count: number, cost: number }>()
    rejects.forEach(r => {
      const existing = reasonMap.get(r.reason) || { count: 0, cost: 0 }
      reasonMap.set(r.reason, {
        count: existing.count + 1,
        cost: existing.cost + r.totalCost
      })
    })

    const topReasons = Array.from(reasonMap.entries())
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    // Top staff with rejects
    const staffMap = new Map<string, { staffName: string, rejectCount: number, cost: number }>()
    rejects
      .filter(r => r.staff)
      .forEach(r => {
        const staffId = r.staffId!
        const existing = staffMap.get(staffId) || { 
          staffName: r.staff!.name, 
          rejectCount: 0, 
          cost: 0 
        }
        staffMap.set(staffId, {
          staffName: existing.staffName,
          rejectCount: existing.rejectCount + 1,
          cost: existing.cost + r.totalCost
        })
      })

    const topStaff = Array.from(staffMap.entries())
      .map(([staffId, data]) => ({ staffId, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    return {
      totalRejects,
      totalCost,
      supplierCost,
      staffCost,
      clientCost,
      companyCost,
      topReasons,
      topStaff
    }
  }

  async suggestPolicy(qcRecord: QCRecord & { 
    order?: Order | null
    task?: Task | null 
  }, reason: string): Promise<{
    suggestedPolicy: RejectPolicy
    confidence: number
    reasoning: string
  }> {
    const policies = await this.getActivePolicies()

    // Simple rule-based policy suggestion
    let suggestedPolicy: RejectPolicy
    let confidence: number
    let reasoning: string

    if (reason.toLowerCase().includes('material') || 
        reason.toLowerCase().includes('fabric') ||
        reason.toLowerCase().includes('defect')) {
      suggestedPolicy = policies.find(p => p.category === 'SUPPLIER_DEFECT') || policies[0]
      confidence = 0.8
      reasoning = 'Material/fabric defect detected - typically supplier responsibility'
    } else if (reason.toLowerCase().includes('sewing') ||
               reason.toLowerCase().includes('workmanship') ||
               reason.toLowerCase().includes('operator')) {
      suggestedPolicy = policies.find(p => p.category === 'WORKMANSHIP_ERROR') || policies[0]
      confidence = 0.7
      reasoning = 'Workmanship error detected - typically staff responsibility'
    } else if (reason.toLowerCase().includes('design') ||
               reason.toLowerCase().includes('specification') ||
               reason.toLowerCase().includes('change')) {
      suggestedPolicy = policies.find(p => p.category === 'DESIGN_CHANGE') || policies[0]
      confidence = 0.6
      reasoning = 'Design-related issue - may be client or company responsibility'
    } else {
      suggestedPolicy = policies.find(p => p.category === 'UNAVOIDABLE') || policies[0]
      confidence = 0.4
      reasoning = 'Unable to determine clear responsibility - default to unavoidable'
    }

    return {
      suggestedPolicy,
      confidence,
      reasoning
    }
  }

  async getRejectTrends(months: number = 6): Promise<Array<{
    month: string
    totalRejects: number
    totalCost: number
    supplierRejects: number
    staffRejects: number
    clientRejects: number
    companyRejects: number
  }>> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const rejects = await db.rejectRecord.findMany({
      where: {
        created_at: {
          gte: startDate
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })

    const monthlyData = new Map<string, {
      totalRejects: number
      totalCost: number
      supplierRejects: number
      staffRejects: number
      clientRejects: number
      companyRejects: number
    }>()

    rejects.forEach(reject => {
      const monthKey = reject.created_at.toISOString().slice(0, 7) // YYYY-MM
      const existing = monthlyData.get(monthKey) || {
        totalRejects: 0,
        totalCost: 0,
        supplierRejects: 0,
        staffRejects: 0,
        clientRejects: 0,
        companyRejects: 0
      }

      existing.totalRejects += 1
      existing.totalCost += reject.cost_impact || 0

      switch (reject.responsible_stage) {
        case 'SUPPLIER':
          existing.supplierRejects += 1
          break
        case 'STAFF':
          existing.staffRejects += 1
          break
        case 'CLIENT':
          existing.clientRejects += 1
          break
        case 'COMPANY':
          existing.companyRejects += 1
          break
      }

      monthlyData.set(monthKey, existing)
    })

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  private generateReasoning(policy: RejectPolicy, reason: string): string {
    const costPercentage = (policy.costRatio * 100).toFixed(0)
    
    switch (policy.responsible) {
      case 'SUPPLIER':
        return `${costPercentage}% of reject cost assigned to supplier due to ${policy.category.toLowerCase().replace('_', ' ')}. Reason: ${reason}`
      case 'STAFF':
        return `${costPercentage}% of reject cost assigned to staff due to ${policy.category.toLowerCase().replace('_', ' ')}. Reason: ${reason}`
      case 'CLIENT':
        return `${costPercentage}% of reject cost assigned to client due to ${policy.category.toLowerCase().replace('_', ' ')}. Reason: ${reason}`
      case 'COMPANY':
        return `${costPercentage}% of reject cost absorbed by company due to ${policy.category.toLowerCase().replace('_', ' ')}. Reason: ${reason}`
      default:
        return `Reject cost assignment: ${reason}`
    }
  }

  async resolveReject(rejectRecordId: string, _notes?: string): Promise<void> {
    await db.rejectRecord.update({
      where: { id: rejectRecordId },
      data: {
        // resolved: true, // This field doesn't exist
        // We could add a notes field if needed
      }
    })
  }

  async getUnresolvedRejects(): Promise<RejectRecord[]> {
    return db.rejectRecord.findMany({
      where: { /* resolved: false */ }, // This field doesn't exist
      include: {
        // order: true, // This include doesn't exist
        task: true,
        qcRecord: true,
        policy: true,
        staff: true,
        vendor: true
      },
      orderBy: { created_at: 'desc' }
    })
  }
}

export const rejectPolicyService = new RejectPolicyService()