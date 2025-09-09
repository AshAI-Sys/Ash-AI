import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// HR Performance Review API for Stage 10 HR System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/hr/performance - Get performance reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const employee_id = searchParams.get('employee_id')
    const reviewer_id = searchParams.get('reviewer_id')
    const review_period = searchParams.get('review_period')
    const status = searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (employee_id) where.employee_id = employee_id
    if (reviewer_id) where.reviewer_id = reviewer_id
    if (review_period) where.review_period = review_period
    if (status) where.status = status

    const performance_reviews = await db.performanceReview.findMany({
      where,
      include: {
        employee: {
          select: {
            employee_no: true,
            first_name: true,
            middle_name: true,
            last_name: true,
            suffix: true,
            department: true,
            job_title: true,
            hire_date: true
          }
        }
      },
      orderBy: [
        { review_date: 'desc' },
        { employee: { last_name: 'asc' } }
      ]
    })

    // Add summary data
    const reviews_with_summary = performance_reviews.map(review => {
      const full_name = [
        review.employee.first_name,
        review.employee.middle_name,
        review.employee.last_name,
        review.employee.suffix
      ].filter(Boolean).join(' ')

      // Calculate average rating
      const ratings = [
        review.work_quality,
        review.productivity,
        review.punctuality,
        review.teamwork,
        review.initiative
      ].filter(r => r !== null) as number[]

      const average_rating = ratings.length > 0 
        ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100
        : null

      return {
        ...review,
        employee: {
          ...review.employee,
          full_name
        },
        summary: {
          average_rating,
          ratings_completed: ratings.length,
          total_ratings: 5,
          is_overdue: review.status === 'DRAFT' && new Date() > new Date(new Date(review.review_date).getTime() + 7 * 24 * 60 * 60 * 1000),
          needs_acknowledgment: review.status === 'SUBMITTED' && !review.acknowledged_at
        }
      }
    })

    return NextResponse.json({
      success: true,
      performance_reviews: reviews_with_summary
    })

  } catch (_error) {
    console.error('Error fetching performance reviews:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance reviews' },
      { status: 500 }
    )
  }
}

// POST /api/hr/performance - Create performance review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      employee_id,
      reviewer_id,
      review_period, // Q1_2024, ANNUAL_2024, etc.
      review_date,
      work_quality,
      productivity,
      punctuality,
      teamwork,
      initiative,
      overall_rating,
      strengths,
      areas_improvement,
      goals_next_period,
      training_needs
    } = body

    if (!workspace_id || !employee_id || !reviewer_id || !review_period || !review_date) {
      return NextResponse.json(
        { error: 'workspace_id, employee_id, reviewer_id, review_period, and review_date are required' },
        { status: 400 }
      )
    }

    // Validate employee exists and is active
    const employee = await db.employee.findFirst({
      where: {
        id: employee_id,
        workspace_id,
        status: 'ACTIVE'
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Active employee not found' },
        { status: 404 }
      )
    }

    // Validate reviewer exists
    const reviewer = await db.employee.findFirst({
      where: {
        id: reviewer_id,
        workspace_id,
        status: 'ACTIVE'
      }
    })

    if (!reviewer) {
      return NextResponse.json(
        { error: 'Active reviewer not found' },
        { status: 404 }
      )
    }

    // Check for existing review in the same period
    const existing_review = await db.performanceReview.findFirst({
      where: {
        workspace_id,
        employee_id,
        review_period
      }
    })

    if (existing_review) {
      return NextResponse.json(
        { error: 'Performance review already exists for this employee and period' },
        { status: 409 }
      )
    }

    // Validate ratings are within 1-5 scale
    const ratings = { work_quality, productivity, punctuality, teamwork, initiative, overall_rating }
    for (const [key, value] of Object.entries(ratings)) {
      if (value !== null && value !== undefined && (value < 1 || value > 5)) {
        return NextResponse.json(
          { error: `${key} rating must be between 1 and 5` },
          { status: 400 }
        )
      }
    }

    // Ashley AI validation for performance review
    const ashley_check = await validateAshleyAI({
      context: 'PERFORMANCE_REVIEW',
      employee_id,
      reviewer_id,
      review_period,
      ratings: {
        work_quality,
        productivity,
        punctuality,
        teamwork,
        initiative,
        overall_rating
      },
      employment_duration_months: Math.floor(
        (new Date().getTime() - new Date(employee.hire_date).getTime()) / (30 * 24 * 60 * 60 * 1000)
      )
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked performance review creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create performance review
    const performance_review = await db.performanceReview.create({
      data: {
        workspace_id,
        employee_id,
        reviewer_id,
        review_period,
        review_date: new Date(review_date),
        work_quality,
        productivity,
        punctuality,
        teamwork,
        initiative,
        overall_rating,
        strengths,
        areas_improvement,
        goals_next_period,
        training_needs,
        status: 'DRAFT'
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'performance_review',
        entity_id: performance_review.id,
        action: 'CREATE',
        after_data: {
          employee_id,
          employee_no: employee.employee_no,
          reviewer_id,
          review_period,
          overall_rating,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      performance_review,
      message: 'Performance review created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating performance review:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create performance review' },
      { status: 500 }
    )
  }
}

// PUT /api/hr/performance - Update performance review status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      performance_review_id,
      workspace_id,
      action, // SUBMIT, ACKNOWLEDGE, DRAFT
      employee_comments,
      updated_ratings, // Optional ratings updates
      updated_feedback // Optional feedback updates
    } = body

    if (!performance_review_id || !workspace_id || !action) {
      return NextResponse.json(
        { error: 'performance_review_id, workspace_id, and action are required' },
        { status: 400 }
      )
    }

    // Get existing performance review
    const existing_review = await db.performanceReview.findFirst({
      where: {
        id: performance_review_id,
        workspace_id
      },
      include: {
        employee: {
          select: {
            employee_no: true,
            first_name: true,
            last_name: true
          }
        }
      }
    })

    if (!existing_review) {
      return NextResponse.json(
        { error: 'Performance review not found' },
        { status: 404 }
      )
    }

    // Validate action transitions
    const valid_transitions: Record<string, string[]> = {
      'DRAFT': ['SUBMIT'],
      'SUBMITTED': ['ACKNOWLEDGE', 'DRAFT'],
      'ACKNOWLEDGED': ['DRAFT'] // Allow re-opening for corrections
    }

    if (!valid_transitions[existing_review.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action '${action}' for review status '${existing_review.status}'` },
        { status: 409 }
      )
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }

    switch (action) {
      case 'SUBMIT':
        // Validate that review has minimum required data
        if (!existing_review.overall_rating) {
          return NextResponse.json(
            { error: 'Overall rating is required before submitting review' },
            { status: 400 }
          )
        }
        update_data.status = 'SUBMITTED'
        break

      case 'ACKNOWLEDGE':
        update_data.status = 'ACKNOWLEDGED'
        update_data.acknowledged_at = new Date()
        if (employee_comments) {
          update_data.employee_comments = employee_comments
        }
        break

      case 'DRAFT':
        update_data.status = 'DRAFT'
        update_data.acknowledged_at = null
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Apply rating updates if provided
    if (updated_ratings) {
      const { work_quality, productivity, punctuality, teamwork, initiative, overall_rating } = updated_ratings
      if (work_quality !== undefined) update_data.work_quality = work_quality
      if (productivity !== undefined) update_data.productivity = productivity
      if (punctuality !== undefined) update_data.punctuality = punctuality
      if (teamwork !== undefined) update_data.teamwork = teamwork
      if (initiative !== undefined) update_data.initiative = initiative
      if (overall_rating !== undefined) update_data.overall_rating = overall_rating
    }

    // Apply feedback updates if provided
    if (updated_feedback) {
      const { strengths, areas_improvement, goals_next_period, training_needs } = updated_feedback
      if (strengths !== undefined) update_data.strengths = strengths
      if (areas_improvement !== undefined) update_data.areas_improvement = areas_improvement
      if (goals_next_period !== undefined) update_data.goals_next_period = goals_next_period
      if (training_needs !== undefined) update_data.training_needs = training_needs
    }

    // Update performance review
    const updated_review = await db.performanceReview.update({
      where: { id: performance_review_id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'performance_review',
        entity_id: performance_review_id,
        action: `REVIEW_${action}`,
        before_data: existing_review,
        after_data: {
          action,
          employee_comments,
          previous_status: existing_review.status,
          new_status: update_data.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      performance_review: updated_review,
      message: `Performance review ${action.toLowerCase()}d successfully`
    })

  } catch (_error) {
    console.error('Error updating performance review:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update performance review' },
      { status: 500 }
    )
  }
}