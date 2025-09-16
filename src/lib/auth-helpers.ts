// Authentication and Authorization Helpers
// Security utilities for API endpoints

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// UUID validation schema
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Get authenticated user from session
 * @param request NextRequest object
 * @returns User session or null
 */
export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return null
    }

    // Get full user details including workspace
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        workspace_id: true,
        role: true,
        active: true,
        email: true
      }
    })

    if (!user || !user.active) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Check if user has required permissions
 * @param user User object
 * @param permission Required permission
 * @returns boolean
 */
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false

  // Admin has all permissions
  if (user.role === 'ADMIN') return true

  // Define role-based permissions
  const rolePermissions: Record<string, string[]> = {
    ADMIN: ['*'], // All permissions
    MANAGER: [
      'orders.create', 'orders.edit', 'orders.view',
      'cutting.issue', 'cutting.create', 'cutting.view', 'cutting.edit', 'cutting.delete',
      'designs.create', 'designs.approve', 'designs.view',
      'ashley-ai.validate'
    ],
    CSR: [
      'orders.create', 'orders.view',
      'designs.create', 'designs.view',
      'cutting.view'
    ],
    OPERATOR: [
      'cutting.issue', 'cutting.create', 'cutting.view',
      'bundles.create', 'bundles.view'
    ],
    GRAPHIC_ARTIST: [
      'designs.create', 'designs.edit', 'designs.view'
    ]
  }

  const userPermissions = rolePermissions[user.role] || []
  return userPermissions.includes('*') || userPermissions.includes(permission)
}

/**
 * Validate workspace access for resource
 * @param user User object
 * @param resourceWorkspaceId Workspace ID of the resource
 * @returns boolean
 */
export function hasWorkspaceAccess(user: any, resourceWorkspaceId: string): boolean {
  if (!user || !resourceWorkspaceId) return false
  return user.workspace_id === resourceWorkspaceId
}

/**
 * Validate and sanitize UUID input
 * @param uuid String to validate
 * @returns Validated UUID or throws error
 */
export function validateUUID(uuid: string): string {
  try {
    return uuidSchema.parse(uuid)
  } catch (error) {
    throw new Error('Invalid UUID format')
  }
}

/**
 * Get order with workspace validation
 * @param orderId Order ID
 * @param userWorkspaceId User's workspace ID
 * @returns Order or null
 */
export async function getOrderWithWorkspaceCheck(orderId: string, userWorkspaceId: string) {
  try {
    validateUUID(orderId)

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        workspace_id: userWorkspaceId
      }
    })

    return order
  } catch (error) {
    console.error('Error getting order with workspace check:', error)
    return null
  }
}

/**
 * Get fabric batch with workspace validation
 * @param batchId Batch ID
 * @param userWorkspaceId User's workspace ID
 * @returns Fabric batch or null
 */
export async function getFabricBatchWithWorkspaceCheck(batchId: string, userWorkspaceId: string) {
  try {
    validateUUID(batchId)

    const batch = await prisma.fabricBatch.findFirst({
      where: {
        id: batchId,
        workspace_id: userWorkspaceId
      }
    })

    return batch
  } catch (error) {
    console.error('Error getting fabric batch with workspace check:', error)
    return null
  }
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

/**
 * Standard forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions') {
  return Response.json(
    { error: message },
    { status: 403 }
  )
}

/**
 * Standard not found response
 */
export function notFoundResponse(resource = 'Resource') {
  return Response.json(
    { error: `${resource} not found` },
    { status: 404 }
  )
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map()

export function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const windowStart = now - windowMs

  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, [])
  }

  const requests = rateLimitMap.get(identifier)

  // Remove old requests outside the window
  const validRequests = requests.filter((time: number) => time > windowStart)

  if (validRequests.length >= maxRequests) {
    return false // Rate limit exceeded
  }

  // Add current request
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)

  return true
}

/**
 * Sanitize input data to prevent injection
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}