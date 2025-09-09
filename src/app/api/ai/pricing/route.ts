import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { aiService } from '@/lib/ai'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Managers, admins, and sales staff can access pricing suggestions
    const allowedRoles = ['ADMIN', 'MANAGER', 'SALES_STAFF', 'CSR', 'LIVE_SELLER']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const orderIds = searchParams.get('orderIds')?.split(',')

    const suggestions = await aiService.getPricingSuggestions(orderIds)

    return NextResponse.json(suggestions)
  } catch (_error) {
    console.error('Error getting pricing suggestions:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}