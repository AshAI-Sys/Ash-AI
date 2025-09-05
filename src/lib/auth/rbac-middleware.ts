import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { RoleBasedAccessControl } from './permissions';
import { authOptions } from '@/lib/auth';

export interface ProtectedRouteConfig {
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  checkTarget?: (request: NextRequest) => Promise<unknown>;
}

export function withRBAC(config: ProtectedRouteConfig) {
  return function (handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>) {
    return async function (request: NextRequest, context?: unknown) {
      try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        const user = {
          id: session.user.id,
          role: session.user.role,
          brandIds: session.user.brandIds || []
        };

        let target = undefined;
        if (config.checkTarget) {
          target = await config.checkTarget(request);
        }

        const hasPermission = RoleBasedAccessControl.hasPermission(
          user,
          config.resource,
          config.action,
          target
        );

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }

        return await handler(request, { ...context, user, target });

      } catch (error) {
        console.error('RBAC middleware error:', error);
        return NextResponse.json(
          { error: 'Authorization check failed' },
          { status: 500 }
        );
      }
    };
  };
}

export async function checkTaskAccess(request: NextRequest) {
  const url = new URL(request.url);
  const taskId = url.pathname.split('/').pop();
  
  if (!taskId) return null;

  const { prisma } = await import('@/lib/prisma');
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      order: true
    }
  });

  return task;
}

export async function checkOrderAccess(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.pathname.split('/').pop();
  
  if (!orderId) return null;

  const { prisma } = await import('@/lib/prisma');
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      brand: true,
      client: true,
      tasks: true
    }
  });

  return order;
}

export async function checkInventoryAccess(request: NextRequest) {
  const url = new URL(request.url);
  const itemId = url.pathname.split('/').pop();
  
  if (!itemId) return null;

  const { prisma } = await import('@/lib/prisma');
  
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      brand: true
    }
  });

  return item;
}

export function requireRole(...allowedRoles: string[]) {
  return async function (request: NextRequest, handler: (request: NextRequest) => Promise<NextResponse>) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  };
}

export function requirePermission(resource: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') {
  return withRBAC({ resource, action });
}

export async function auditAction(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  request?: NextRequest
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        ipAddress: request?.ip || request?.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request?.headers.get('user-agent') || 'unknown',
        sessionId: request?.cookies.get('next-auth.session-token')?.value || 'unknown'
      }
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}