import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RoleBasedAccessControl } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
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
      role: session.user.role
    };

    if (!RoleBasedAccessControl.hasPermission(user, 'audit', 'READ')) {
      await AuditLogger.logAccessDenied('audit', 'READ', user.id, { request });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const user_id = searchParams.get('user_id') || undefined;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100');

    let dateRange = undefined;
    if (fromDate && toDate) {
      dateRange = {
        from: new Date(fromDate),
        to: new Date(toDate)
      };
    }

    const auditTrail = await AuditLogger.getAuditTrail(
      entityType,
      entityId,
      user_id,
      dateRange,
      limit
    );

    await AuditLogger.log({
      action: 'AUDIT_TRAIL_ACCESSED',
      entity: 'AuditLog',
      metadata: { 
        entityType, 
        entityId, 
        user_id: user_id || 'all',
        dateRange: dateRange ? `${dateRange.from} to ${dateRange.to}` : 'all',
        resultCount: auditTrail.length
      },
      severity: 'LOW',
      category: 'SYSTEM'
    }, { user_id: user.id, request });

    return NextResponse.json({
      success: true,
      data: auditTrail,
      totalCount: auditTrail.length
    });

  } catch (_error) {
    console.error('Audit trail error:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}