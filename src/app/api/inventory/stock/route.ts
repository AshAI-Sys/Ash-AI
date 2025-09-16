/**
 * Stock Management API Endpoint for ASH AI
 * Handles stock movements, alerts, and inventory operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { stockManager } from '@/lib/inventory/stock-manager';
import { logError, ErrorType, ErrorSeverity } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const materialId = searchParams.get('materialId');

    switch (action) {
      case 'alerts':
        const alerts = await stockManager.checkStockAlerts(materialId || undefined);
        return NextResponse.json({ alerts });

      case 'purchase-suggestions':
        if (!user.workspace_id) {
          return NextResponse.json({ error: 'Workspace not found' }, { status: 400 });
        }
        const suggestions = await stockManager.generatePurchaseSuggestions(user.workspace_id);
        return NextResponse.json({ suggestions });

      case 'report':
        if (!user.workspace_id) {
          return NextResponse.json({ error: 'Workspace not found' }, { status: 400 });
        }
        const report = await stockManager.generateInventoryReport(user.workspace_id);
        return NextResponse.json({ report });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    await logError({
      type: ErrorType.API,
      severity: ErrorSeverity.MEDIUM,
      message: 'Inventory stock API error',
      context: {
        endpoint: '/api/inventory/stock',
        method: 'GET',
        error: error.message
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (only ADMIN and MANAGER can modify stock)
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'movement':
        // Record stock movement
        const movement = await stockManager.recordStockMovement({
          materialId: data.materialId,
          movementType: data.movementType,
          quantity: data.quantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          reason: data.reason,
          performedBy: user.id
        });

        return NextResponse.json({ movement });

      case 'batch-update':
        // Batch update stock levels
        const updates = data.updates.map((update: any) => ({
          ...update,
          performedBy: user.id
        }));

        const result = await stockManager.batchUpdateStock(updates);
        return NextResponse.json({ result });

      case 'reserve':
        // Reserve stock for production
        const reservations = data.reservations.map((reservation: any) => ({
          ...reservation,
          performedBy: user.id
        }));

        const reserveSuccess = await stockManager.reserveStock(reservations);
        return NextResponse.json({ success: reserveSuccess });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    await logError({
      type: ErrorType.API,
      severity: ErrorSeverity.MEDIUM,
      message: 'Inventory stock API error',
      context: {
        endpoint: '/api/inventory/stock',
        method: 'POST',
        error: error.message
      }
    });

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}