// @ts-nocheck
// Error Handler - CLIENT_UPDATED_PLAN.md Implementation  
// Centralized error handling and logging system

export async function logError(
  error: Error | string,
  context?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? null : error.stack
  
  console.error(`[ERROR] ${errorMessage}`, {
    context: context || 'Unknown Context',
    metadata: metadata || {},
    stack: errorStack
  })
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return Response.json({
    success: true,
    message: message || 'Success',
    data
  }, { status: 200 })
}

export function createErrorResponse(error: string, status: number = 500) {
  return Response.json({
    success: false,
    error
  }, { status })
}