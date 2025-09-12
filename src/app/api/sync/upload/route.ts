// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { changes } = await request.json();
    const conflicts: Record<string, unknown>[] = [];
    const processedChanges: Record<string, unknown>[] = [];

    for (const change of changes) {
      try {
        const conflict = await processChange(change, session.user.id);
        if (conflict) {
          conflicts.push(conflict);
        } else {
          processedChanges.push(change);
        }
      } catch (_error) {
        console.error('Error processing change:', _error);
      }
    }

    await logAuditTrail(session.user.id, processedChanges);

    return NextResponse.json({
      success: true,
      processed: processedChanges.length,
      conflicts: conflicts
    });

  } catch (_error) {
    console.error('Sync upload error:', _error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

interface ChangeData {
  entity: string;
  entityId: string;
  operation: string;
  data: Record<string, unknown>;
  timestamp: number;
}

async function processChange(change: ChangeData, user_id: string) {
  const { entity, entityId, operation, data, timestamp } = change;

  switch (entity.toLowerCase()) {
    case 'task':
      return await processTaskChange(entityId, operation, data, timestamp, user_id);
    case 'timerecord':
      return await processTimeRecordChange(entityId, operation, data, timestamp, user_id);
    case 'stockmovement':
      return await processStockMovementChange(entityId, operation, data, timestamp, user_id);
    default:
      console.warn(`Unknown entity type: ${entity}`);
      return null;
  }
}

async function processTaskChange(entityId: string, operation: string, data: Record<string, unknown>, timestamp: number, user_id: string) {
  switch (operation) {
    case 'CREATE':
      await prisma.task.create({
        data: {
          ...data,
          id: entityId,
          assignedTo: user_id
        }
      });
      break;
    
    case 'UPDATE':
      const existingTask = await prisma.task.findUnique({
        where: { id: entityId }
      });

      if (!existingTask) {
        return null;
      }

      if (new Date(existingTask.updated_at).getTime() > timestamp) {
        return await prisma.syncConflict.create({
          data: {
            entity: 'Task',
            entityId,
            field: 'updatedAt',
            localValue: new Date(timestamp),
            serverValue: existingTask.updated_at
          }
        });
      }

      await prisma.task.update({
        where: { id: entityId },
        data: data
      });
      break;
  }

  return null;
}

async function processTimeRecordChange(entityId: string, operation: string, data: Record<string, unknown>, timestamp: number, _userId: string) {
  switch (operation) {
    case 'CREATE':
      await prisma.timeRecord.create({
        data: {
          ...data,
          id: entityId,
          employeeId: user_id
        }
      });
      break;
    
    case 'UPDATE':
      await prisma.timeRecord.update({
        where: { id: entityId },
        data: data
      });
      break;
  }

  return null;
}

async function processStockMovementChange(entityId: string, operation: string, data: Record<string, unknown>, _timestamp: number, _userId: string) {
  switch (operation) {
    case 'CREATE':
      await prisma.stockMovement.create({
        data: {
          ...data,
          id: entityId
        }
      });

      await prisma.inventoryItem.update({
        where: { id: data.inventoryId },
        data: {
          quantity: {
            increment: data.type === 'IN' ? data.quantity : -data.quantity
          }
        }
      });
      break;
  }

  return null;
}

async function logAuditTrail(user_id: string, changes: Record<string, unknown>[]) {
  for (const change of changes) {
    await prisma.auditLog.create({
      data: {
        user_id,
        action: change.operation,
        entity: change.entity,
        entityId: change.entityId,
        newValues: change.data,
        timestamp: new Date(change.timestamp)
      }
    });
  }
}