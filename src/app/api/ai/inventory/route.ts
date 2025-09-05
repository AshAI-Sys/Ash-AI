import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiService } from '@/lib/ai'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Managers, admins, and warehouse staff can access inventory suggestions
    const allowedRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'PURCHASER']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const suggestions = await aiService.getInventorySuggestions()

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error getting inventory suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}