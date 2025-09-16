/**
 * Inventory Management System for ASH AI
 * Handles stock tracking, reorder points, and material management
 */

import { prisma } from '../prisma';
import { logError, ErrorType, ErrorSeverity } from '../error-handler';

export interface StockMovement {
  id: string;
  materialId: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  referenceType: 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'ADJUSTMENT' | 'TRANSFER';
  referenceId?: string;
  reason: string;
  performedBy: string;
  timestamp: Date;
  balanceAfter: number;
}

export interface StockAlert {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  minimumStock: number;
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  severity: 'low' | 'medium' | 'high';
  daysUntilStockout?: number;
}

export interface InventoryReport {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  turnoverRate: number;
  categories: {
    [category: string]: {
      value: number;
      items: number;
      percentage: number;
    };
  };
}

export class StockManager {
  /**
   * Record stock movement (in, out, adjustment, transfer)
   */
  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp' | 'balanceAfter'>): Promise<StockMovement> {
    try {
      // Get current material stock
      const material = await prisma.material.findUnique({
        where: { id: movement.materialId },
        select: { currentStock: true, code: true, name: true }
      });

      if (!material) {
        throw new Error(`Material not found: ${movement.materialId}`);
      }

      // Calculate new balance
      let newBalance = material.currentStock;

      switch (movement.movementType) {
        case 'IN':
          newBalance += movement.quantity;
          break;
        case 'OUT':
          newBalance -= movement.quantity;
          break;
        case 'ADJUSTMENT':
          // For adjustments, quantity is the adjustment amount (can be positive or negative)
          newBalance += movement.quantity;
          break;
        case 'TRANSFER':
          // For transfers, this is typically OUT from source location
          newBalance -= movement.quantity;
          break;
      }

      // Prevent negative stock unless it's an adjustment
      if (newBalance < 0 && movement.movementType !== 'ADJUSTMENT') {
        throw new Error(`Insufficient stock. Available: ${material.currentStock}, Requested: ${movement.quantity}`);
      }

      // Create stock movement record and update material stock in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create stock movement record
        const stockMovement = await tx.stockMovement.create({
          data: {
            materialId: movement.materialId,
            movementType: movement.movementType,
            quantity: movement.quantity,
            referenceType: movement.referenceType,
            referenceId: movement.referenceId,
            reason: movement.reason,
            performedBy: movement.performedBy,
            balanceAfter: newBalance
          }
        });

        // Update material current stock
        await tx.material.update({
          where: { id: movement.materialId },
          data: {
            currentStock: newBalance,
            lastUpdated: new Date()
          }
        });

        return stockMovement;
      });

      // Check for stock alerts after movement
      await this.checkStockAlerts(movement.materialId);

      // Log significant stock movements
      if (movement.movementType === 'OUT' && movement.quantity > material.currentStock * 0.1) {
        await logError({
          type: ErrorType.BUSINESS,
          severity: ErrorSeverity.LOW,
          message: `Large stock movement recorded`,
          context: {
            materialCode: material.code,
            materialName: material.name,
            movementType: movement.movementType,
            quantity: movement.quantity,
            reason: movement.reason
          },
          metadata: { stockMovementId: result.id }
        });
      }

      return {
        ...result,
        timestamp: result.createdAt
      } as StockMovement;

    } catch (error) {
      await logError({
        type: ErrorType.BUSINESS,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to record stock movement',
        context: {
          materialId: movement.materialId,
          movementType: movement.movementType,
          quantity: movement.quantity,
          error: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Check for stock alerts (low stock, out of stock, overstock)
   */
  async checkStockAlerts(materialId?: string): Promise<StockAlert[]> {
    try {
      const whereClause = materialId ? { id: materialId } : {};

      const materials = await prisma.material.findMany({
        where: {
          ...whereClause,
          isActive: true
        },
        select: {
          id: true,
          code: true,
          name: true,
          currentStock: true,
          minimumStock: true,
          maximumStock: true,
          averageConsumption: true
        }
      });

      const alerts: StockAlert[] = [];

      for (const material of materials) {
        // Out of stock
        if (material.currentStock <= 0) {
          alerts.push({
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            currentStock: material.currentStock,
            minimumStock: material.minimumStock,
            alertType: 'OUT_OF_STOCK',
            severity: 'high'
          });
        }
        // Low stock
        else if (material.currentStock <= material.minimumStock) {
          const daysUntilStockout = material.averageConsumption && material.averageConsumption > 0
            ? Math.floor(material.currentStock / material.averageConsumption)
            : undefined;

          alerts.push({
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            currentStock: material.currentStock,
            minimumStock: material.minimumStock,
            alertType: 'LOW_STOCK',
            severity: material.currentStock <= material.minimumStock * 0.5 ? 'high' : 'medium',
            daysUntilStockout
          });
        }
        // Overstock
        else if (material.maximumStock && material.currentStock >= material.maximumStock) {
          alerts.push({
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            currentStock: material.currentStock,
            minimumStock: material.minimumStock,
            alertType: 'OVERSTOCK',
            severity: 'low'
          });
        }
      }

      // Log critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'high');
      if (criticalAlerts.length > 0) {
        await logError({
          type: ErrorType.BUSINESS,
          severity: ErrorSeverity.MEDIUM,
          message: `${criticalAlerts.length} critical stock alerts detected`,
          context: {
            alerts: criticalAlerts.map(a => ({
              materialCode: a.materialCode,
              alertType: a.alertType,
              currentStock: a.currentStock
            }))
          }
        });
      }

      return alerts;

    } catch (error) {
      await logError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to check stock alerts',
        context: { materialId, error: error.message }
      });
      return [];
    }
  }

  /**
   * Generate purchase suggestions based on stock levels and consumption
   */
  async generatePurchaseSuggestions(workspaceId: string): Promise<any[]> {
    try {
      const materials = await prisma.material.findMany({
        where: {
          workspaceId: workspaceId,
          isActive: true,
          currentStock: {
            lte: prisma.material.fields.minimumStock
          }
        },
        select: {
          id: true,
          code: true,
          name: true,
          currentStock: true,
          minimumStock: true,
          maximumStock: true,
          averageConsumption: true,
          costPerUnit: true,
          preferredVendor: true,
          leadTimeDays: true
        }
      });

      const suggestions = materials.map(material => {
        // Calculate suggested order quantity
        const targetStock = material.maximumStock || material.minimumStock * 3;
        const suggestedQuantity = Math.max(
          targetStock - material.currentStock,
          material.averageConsumption * (material.leadTimeDays || 7) // Lead time coverage
        );

        // Calculate urgency based on consumption rate
        const daysUntilStockout = material.averageConsumption && material.averageConsumption > 0
          ? material.currentStock / material.averageConsumption
          : null;

        let urgency: 'low' | 'medium' | 'high' = 'low';
        if (material.currentStock <= 0) urgency = 'high';
        else if (daysUntilStockout && daysUntilStockout <= 3) urgency = 'high';
        else if (daysUntilStockout && daysUntilStockout <= 7) urgency = 'medium';

        return {
          materialId: material.id,
          materialCode: material.code,
          materialName: material.name,
          currentStock: material.currentStock,
          minimumStock: material.minimumStock,
          suggestedQuantity: Math.ceil(suggestedQuantity),
          estimatedCost: Math.ceil(suggestedQuantity) * material.costPerUnit,
          urgency,
          daysUntilStockout,
          preferredVendor: material.preferredVendor,
          leadTimeDays: material.leadTimeDays
        };
      });

      // Sort by urgency and then by estimated cost
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        }
        return b.estimatedCost - a.estimatedCost;
      });

      return suggestions;

    } catch (error) {
      await logError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to generate purchase suggestions',
        context: { workspaceId, error: error.message }
      });
      return [];
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(workspaceId: string): Promise<InventoryReport> {
    try {
      const materials = await prisma.material.findMany({
        where: {
          workspaceId: workspaceId,
          isActive: true
        },
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          currentStock: true,
          minimumStock: true,
          maximumStock: true,
          costPerUnit: true
        }
      });

      // Calculate totals
      const totalValue = materials.reduce((sum, m) => sum + (m.currentStock * m.costPerUnit), 0);
      const totalItems = materials.length;

      // Count alert items
      const lowStockItems = materials.filter(m => m.currentStock <= m.minimumStock).length;
      const outOfStockItems = materials.filter(m => m.currentStock <= 0).length;
      const overStockItems = materials.filter(m =>
        m.maximumStock && m.currentStock >= m.maximumStock
      ).length;

      // Group by category
      const categories: { [key: string]: any } = {};
      materials.forEach(material => {
        const category = material.category || 'Uncategorized';
        if (!categories[category]) {
          categories[category] = { value: 0, items: 0 };
        }
        categories[category].value += material.currentStock * material.costPerUnit;
        categories[category].items += 1;
      });

      // Calculate percentages
      Object.keys(categories).forEach(category => {
        categories[category].percentage = totalValue > 0
          ? (categories[category].value / totalValue) * 100
          : 0;
      });

      // Calculate turnover rate (simplified - would need more data for accurate calculation)
      const turnoverRate = 0; // This would require historical consumption data

      return {
        totalValue,
        totalItems,
        lowStockItems,
        outOfStockItems,
        overStockItems,
        turnoverRate,
        categories
      };

    } catch (error) {
      await logError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to generate inventory report',
        context: { workspaceId, error: error.message }
      });

      // Return empty report on error
      return {
        totalValue: 0,
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        overStockItems: 0,
        turnoverRate: 0,
        categories: {}
      };
    }
  }

  /**
   * Batch update material stock levels
   */
  async batchUpdateStock(updates: Array<{
    materialId: string;
    newStock: number;
    reason: string;
    performedBy: string;
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        await this.recordStockMovement({
          materialId: update.materialId,
          movementType: 'ADJUSTMENT',
          quantity: update.newStock, // Will be calculated as adjustment in recordStockMovement
          referenceType: 'ADJUSTMENT',
          reason: update.reason,
          performedBy: update.performedBy
        });
        success++;
      } catch (error) {
        failed++;
        errors.push(`${update.materialId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Reserve stock for production order
   */
  async reserveStock(reservations: Array<{
    materialId: string;
    quantity: number;
    productionOrderId: string;
    performedBy: string;
  }>): Promise<boolean> {
    try {
      for (const reservation of reservations) {
        await this.recordStockMovement({
          materialId: reservation.materialId,
          movementType: 'OUT',
          quantity: reservation.quantity,
          referenceType: 'PRODUCTION_ORDER',
          referenceId: reservation.productionOrderId,
          reason: `Reserved for production order ${reservation.productionOrderId}`,
          performedBy: reservation.performedBy
        });
      }
      return true;
    } catch (error) {
      await logError({
        type: ErrorType.BUSINESS,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to reserve stock',
        context: { reservations, error: error.message }
      });
      return false;
    }
  }
}

// Export singleton instance
export const stockManager = new StockManager();