// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Mock AI insights for now
    const insights = [
      {
        id: 'insight-1',
        type: 'forecast',
        title: 'Projected Material Shortage',
        description: 'Cotton fabric inventory will run low by Friday based on current usage patterns and pending orders.',
        impact: 'high',
        confidence: 0.87,
        actions: [
          { label: 'Order Cotton Fabric', endpoint: '/api/purchase/create' },
          { label: 'Contact Suppliers', endpoint: '/api/suppliers' }
        ]
      },
      {
        id: 'insight-2',
        type: 'recommendation',
        title: 'Optimize Sewing Station Assignment',
        description: 'Reassigning tasks from Station 3 to Station 5 could improve overall efficiency by 12%.',
        impact: 'medium',
        confidence: 0.73,
        actions: [
          { label: 'Reassign Tasks', endpoint: '/api/tasks/reassign' }
        ]
      },
      {
        id: 'insight-3',
        type: 'opportunity',
        title: 'Bulk Discount Opportunity',
        description: 'Current pending orders from ABC Corp could qualify for 15% bulk pricing discount.',
        impact: 'medium',
        confidence: 0.91,
        actions: [
          { label: 'Apply Discount', endpoint: '/api/orders/discount' }
        ]
      }
    ];

    return NextResponse.json({ insights });

  } catch (_error) {
    console.error('Ashley insights error:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}