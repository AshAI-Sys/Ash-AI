import { prisma as db } from './db'
import { BOM } from '@prisma/client'

export interface BOMCalculation {
  requiredQty: number
  shrinkageFactor: number
  wastageFactor: number
  actualQty: number
  unitCost: number
  totalCost: number
}

export interface BOMSummary {
  order_id: string
  totalItems: number
  totalCost: number
  totalShrinkage: number
  totalWastage: number
  profitMargin?: number
}

class BOMService {
  async createBOM(order_id: string, items: Array<{
    inventoryId: string
    requiredQty: number
    shrinkageFactor?: number
    wastageFactor?: number
  }>): Promise<BOM> {
    const order = await db.order.findUnique({
      where: { id: order_id },
      include: { bom: true }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    if (order.bom) {
      await this.archiveBOM(order.bom.id)
    }

    const bomItems: Array<BOMCalculation> = []
    let totalCost = 0

    for (const item of items) {
      const inventory = await db.inventoryItem.findUnique({
        where: { id: item.inventoryId }
      })

      if (!inventory) {
        throw new Error(`Inventory item ${item.inventoryId} not found`)
      }

      const shrinkageFactor = item.shrinkageFactor ?? 0.05 // 5% default
      const wastageFactor = item.wastageFactor ?? 0.02 // 2% default
      const actualQty = item.requiredQty * (1 + shrinkageFactor + wastageFactor)
      const totalItemCost = actualQty * inventory.unitCost

      bomItems.push({
        requiredQty: item.requiredQty,
        shrinkageFactor,
        wastageFactor,
        actualQty,
        unitCost: inventory.unitCost,
        totalCost: totalItemCost
      })

      totalCost += totalItemCost
    }

    const bom = await db.bOM.create({
      data: {
        order_id,
        totalCost,
        is_active: true,
        items: {
          create: items.map((_item, index) => ({
            inventoryId: item.inventoryId,
            requiredQty: item.requiredQty,
            shrinkageFactor: bomItems[index].shrinkageFactor,
            wastageFactor: bomItems[index].wastageFactor,
            actualQty: bomItems[index].actualQty,
            unitCost: bomItems[index].unitCost,
            totalCost: bomItems[index].totalCost
          }))
        }
      },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })

    return bom
  }

  async updateBOM(bomId: string, items: Array<{
    id?: string
    inventoryId: string
    requiredQty: number
    shrinkageFactor?: number
    wastageFactor?: number
  }>): Promise<BOM> {
    await db.bOMItem.deleteMany({
      where: { bomId }
    })

    let totalCost = 0
    const bomItems: Array<BOMCalculation> = []

    for (const item of items) {
      const inventory = await db.inventoryItem.findUnique({
        where: { id: item.inventoryId }
      })

      if (!inventory) {
        throw new Error(`Inventory item ${item.inventoryId} not found`)
      }

      const shrinkageFactor = item.shrinkageFactor ?? 0.05
      const wastageFactor = item.wastageFactor ?? 0.02
      const actualQty = item.requiredQty * (1 + shrinkageFactor + wastageFactor)
      const totalItemCost = actualQty * inventory.unitCost

      bomItems.push({
        requiredQty: item.requiredQty,
        shrinkageFactor,
        wastageFactor,
        actualQty,
        unitCost: inventory.unitCost,
        totalCost: totalItemCost
      })

      totalCost += totalItemCost
    }

    await db.bOMItem.createMany({
      data: items.map((_item, index) => ({
        bomId,
        inventoryId: item.inventoryId,
        requiredQty: item.requiredQty,
        shrinkageFactor: bomItems[index].shrinkageFactor,
        wastageFactor: bomItems[index].wastageFactor,
        actualQty: bomItems[index].actualQty,
        unitCost: bomItems[index].unitCost,
        totalCost: bomItems[index].totalCost
      }))
    })

    const updatedBOM = await db.bOM.update({
      where: { id: bomId },
      data: { 
        totalCost,
        version: { increment: 1 }
      },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })

    return updatedBOM
  }

  async getBOMByOrderId(order_id: string): Promise<BOM | null> {
    return db.bOM.findUnique({
      where: { order_id },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })
  }

  async calculateBOMSummary(bomId: string): Promise<BOMSummary> {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: {
            inventory: true
          }
        },
        order: true
      }
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    const totalShrinkage = bom.items.reduce((sum, item) => 
      sum + (item.requiredQty * item.shrinkageFactor), 0
    )

    const totalWastage = bom.items.reduce((sum, item) => 
      sum + (item.requiredQty * item.wastageFactor), 0
    )

    return {
      order_id: bom.order_id,
      totalItems: bom.items.length,
      totalCost: bom.totalCost,
      totalShrinkage,
      totalWastage
    }
  }

  async validateInventoryAvailability(bomId: string): Promise<Array<{
    inventoryId: string
    inventoryName: string
    required: number
    available: number
    shortage: number
  }>> {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    const shortages: Array<{
      inventoryId: string
      inventoryName: string
      required: number
      available: number
      shortage: number
    }> = []

    for (const item of bom.items) {
      const required = item.actualQty ?? item.requiredQty
      const available = item.inventory.quantity
      
      if (available < required) {
        shortages.push({
          inventoryId: item.inventoryId,
          inventoryName: item.inventory.name,
          required,
          available,
          shortage: required - available
        })
      }
    }

    return shortages
  }

  async consumeInventory(bomId: string, _notes?: string): Promise<void> {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: {
            inventory: true
          }
        },
        order: true
      }
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    // Validate availability first
    const shortages = await this.validateInventoryAvailability(bomId)
    if (shortages.length > 0) {
      throw new Error(`Inventory shortage: ${shortages.map(s => 
        `${s.inventoryName} (need ${s.required}, have ${s.available})`
      ).join(', ')}`)
    }

    await db.$transaction(async (tx) => {
      for (const item of bom.items) {
        const actualQty = item.actualQty ?? item.requiredQty

        await tx.inventoryItem.update({
          where: { id: item.inventoryId },
          data: {
            quantity: {
              decrement: actualQty
            }
          }
        })

        await tx.stockMovement.create({
          data: {
            inventoryId: item.inventoryId,
            type: 'OUT',
            quantity: -actualQty,
            reason: 'Production consumption',
            reference: bom.order.orderNumber
          }
        })

        await tx.materialUsage.create({
          data: {
            inventoryId: item.inventoryId,
            order_id: bom.order_id,
            quantityUsed: actualQty,
            unitCost: item.unitCost,
            totalCost: item.totalCost
          }
        })
      }
    })
  }

  async getBOMCostBreakdown(bomId: string): Promise<{
    materialCost: number
    shrinkageCost: number
    wastageCost: number
    totalCost: number
    items: Array<{
      name: string
      requiredQty: number
      actualQty: number
      shrinkageCost: number
      wastageCost: number
      totalCost: number
    }>
  }> {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    let materialCost = 0
    let shrinkageCost = 0
    let wastageCost = 0

    const items = bom.items.map(item => {
      const baseCost = item.requiredQty * item.unitCost
      const itemShrinkageCost = item.requiredQty * item.shrinkageFactor * item.unitCost
      const itemWastageCost = item.requiredQty * item.wastageFactor * item.unitCost

      materialCost += baseCost
      shrinkageCost += itemShrinkageCost
      wastageCost += itemWastageCost

      return {
        name: item.inventory.name,
        requiredQty: item.requiredQty,
        actualQty: item.actualQty ?? item.requiredQty,
        shrinkageCost: itemShrinkageCost,
        wastageCost: itemWastageCost,
        totalCost: _item.totalCost
      }
    })

    return {
      materialCost,
      shrinkageCost,
      wastageCost,
      totalCost: materialCost + shrinkageCost + wastageCost,
      items
    }
  }

  private async archiveBOM(bomId: string): Promise<void> {
    await db.bOM.update({
      where: { id: bomId },
      data: { is_active: false }
    })
  }

  async getBOMHistory(order_id: string): Promise<BOM[]> {
    return db.bOM.findMany({
      where: { order_id },
      orderBy: { version: 'desc' },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })
  }

  async optimizeBOM(bomId: string): Promise<{
    currentCost: number
    optimizedCost: number
    savings: number
    suggestions: Array<{
      item: string
      suggestion: string
      potentialSaving: number
    }>
  }> {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: {
            inventory: true
          }
        }
      }
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    const suggestions: Array<{
      item: string
      suggestion: string
      potentialSaving: number
    }> = []

    let optimizedCost = bom.totalCost

    for (const item of bom.items) {
      if (item.shrinkageFactor > 0.08) {
        const saving = item.requiredQty * (item.shrinkageFactor - 0.05) * item.unitCost
        suggestions.push({
          item: item.inventory.name,
          suggestion: `Reduce shrinkage factor from ${(item.shrinkageFactor * 100).toFixed(1)}% to 5%`,
          potentialSaving: saving
        })
        optimizedCost -= saving
      }

      if (item.wastageFactor > 0.03) {
        const saving = item.requiredQty * (item.wastageFactor - 0.02) * item.unitCost
        suggestions.push({
          item: item.inventory.name,
          suggestion: `Reduce wastage factor from ${(item.wastageFactor * 100).toFixed(1)}% to 2%`,
          potentialSaving: saving
        })
        optimizedCost -= saving
      }
    }

    return {
      currentCost: bom.totalCost,
      optimizedCost,
      savings: bom.totalCost - optimizedCost,
      suggestions
    }
  }
}

export const bomService = new BOMService()