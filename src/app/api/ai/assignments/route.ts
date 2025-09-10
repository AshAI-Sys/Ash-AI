import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { aiService } from '@/lib/ai'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can access AI suggestions
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const taskIds = searchParams.get('taskIds')?.split(',')

    const suggestions = await aiService.getAssignmentSuggestions(taskIds)

    return NextResponse.json(suggestions)
  } catch (_error) {
    console.error('Error getting assignment suggestions:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { taskId, assigneeId } = await req.json()

    // Apply the AI suggestion by updating the task assignment
    const { prisma: db } = await import('@/lib/db')
    
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: { 
        assigned_to: assigneeId,
        status: 'OPEN' // Keep as open until work starts
      }
    })

    return NextResponse.json({
      success: true,
      task: updatedTask
    })
  } catch (_error) {
    console.error('Error applying assignment suggestion:', _error)
    return NextResponse.json(
      { error: 'Failed to apply assignment' },
      { status: 500 }
    )
  }
}