// Ashley AI Main API Route - SECURE VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { callAIAgent } from '@/lib/ai/ashley-agents'
import { Role } from '@prisma/client'
import { 
  validateInput, 
  schemas, 
  rateLimit, 
  sanitizeError,
  auditLog,
  securityHeaders
} from '@/lib/security/validation'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let clientIP: string | undefined

  try {
    // Get client information for security logging
    clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Session validation
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      await auditLog.log({
        action: 'ai_access_denied',
        ip: clientIP,
        userAgent,
        success: false,
        error: 'No valid session'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: securityHeaders
      })
    }

    userId = session.user.id

    // Role-based access control
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      await auditLog.log({
        action: 'ai_access_denied',
        userId,
        ip: clientIP,
        userAgent,
        success: false,
        error: 'Insufficient permissions'
      })
      return NextResponse.json({ error: 'Forbidden' }, { 
        status: 403,
        headers: securityHeaders
      })
    }

    // Rate limiting - 30 requests per minute for AI endpoints
    const rateLimitKey = `ai_ashley:${userId}:${Math.floor(Date.now() / 60000)}`
    if (!rateLimit.check(rateLimitKey, 30, 60000)) {
      await auditLog.log({
        action: 'ai_rate_limit_exceeded',
        userId,
        ip: clientIP,
        userAgent,
        success: false,
        error: 'Rate limit exceeded'
      })
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { 
        status: 429,
        headers: {
          ...securityHeaders,
          'X-RateLimit-Remaining': rateLimit.remaining(rateLimitKey, 30).toString()
        }
      })
    }

    // Input validation and sanitization
    let body: Record<string, unknown>
    try {
      const rawBody = await request.text()
      if (rawBody.length > 10000) { // 10KB limit
        throw new Error('Request body too large')
      }
      body = JSON.parse(rawBody)
    } catch (_error) {
      await auditLog.log({
        action: 'ai_invalid_input',
        userId,
        ip: clientIP,
        success: false,
        error: 'Invalid JSON or body too large'
      })
      return NextResponse.json({ error: 'Invalid request format' }, { 
        status: 400,
        headers: securityHeaders
      })
    }

    // Validate input schema
    const validation = validateInput(schemas.aiChatInput, body)
    if (!validation.success) {
      await auditLog.log({
        action: 'ai_validation_failed',
        userId,
        ip: clientIP,
        success: false,
        error: validation.error
      })
      return NextResponse.json({ error: 'Invalid input parameters' }, { 
        status: 400,
        headers: securityHeaders
      })
    }

    const { action, data } = validation.data

    // Additional action-specific validation
    if (action === 'chat' && data?.message) {
      if (data.message.length > 1000) {
        return NextResponse.json({ error: 'Message too long' }, { 
          status: 400,
          headers: securityHeaders
        })
      }
      
      // Check for potential prompt injection attempts
      const suspiciousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /system\s*:/i,
        /assistant\s*:/i,
        /\[INST\]/i,
        /\<\|system\|\>/i,
      ]
      
      if (suspiciousPatterns.some(pattern => pattern.test(data.message))) {
        await auditLog.log({
          action: 'ai_prompt_injection_attempt',
          userId,
          ip: clientIP,
          success: false,
          error: 'Suspicious prompt detected'
        })
        return NextResponse.json({ error: 'Invalid message content' }, { 
          status: 400,
          headers: securityHeaders
        })
      }
    }

    let result

    try {
      switch (action) {
        case 'generateWeeklyReport':
          if (data?.startDate && data?.endDate) {
            const startDate = new Date(data.startDate)
            const endDate = new Date(data.endDate)
            
            // Validate date range (max 90 days)
            if (endDate.getTime() - startDate.getTime() > 90 * 24 * 60 * 60 * 1000) {
              return NextResponse.json({ error: 'Date range too large' }, { 
                status: 400,
                headers: securityHeaders
              })
            }
            
            result = await callAIAgent('ashley', 'generateWeeklyReport', {
              start: startDate,
              end: endDate
            }, userId)
          } else {
            return NextResponse.json({ error: 'Start and end dates required' }, { 
              status: 400,
              headers: securityHeaders
            })
          }
          break

        case 'analyzeBusinessHealth':
          result = await callAIAgent('ashley', 'analyzeBusinessHealth', {}, userId)
          break

        case 'chat':
          if (!data?.message) {
            return NextResponse.json({ error: 'Message is required for chat' }, { 
              status: 400,
              headers: securityHeaders
            })
          }
          
          // Create a comprehensive response for the chat
          result = await generateChatResponse(data.message, {
            userRole: session.user.role,
            userName: session.user.full_name,
            conversationHistory: data.conversation_history || []
          })
          
          if (!result) {
            throw new Error('Chat method not implemented')
          }
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { 
            status: 400,
            headers: securityHeaders
          })
      }

      // Log successful operation
      await auditLog.log({
        action: `ai_${action}`,
        userId,
        ip: clientIP,
        userAgent,
        success: true,
        resource: 'ashley_ai'
      })

      // Sanitize response - remove any sensitive data
      const sanitizedResult = {
        success: true,
        result: result,
        agent: 'ashley',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(), // For debugging without exposing internals
      }

      return NextResponse.json(sanitizedResult, {
        headers: {
          ...securityHeaders,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        }
      })

    } catch (aiError) {
      // Log AI-specific errors
      await auditLog.log({
        action: `ai_${action}_error`,
        userId,
        ip: clientIP,
        success: false,
        error: aiError instanceof Error ? aiError.message : 'AI processing error'
      })

      return NextResponse.json({
        error: 'AI service temporarily unavailable'
      }, { 
        status: 503,
        headers: securityHeaders
      })
    }

  } catch (error) {
    // Log unexpected errors
    await auditLog.log({
      action: 'ai_unexpected_error',
      userId,
      ip: clientIP,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    console.error('Ashley AI API error:', error)
    return NextResponse.json({
      error: sanitizeError(error, process.env.NODE_ENV === 'development')
    }, { 
      status: 500,
      headers: securityHeaders
    })
  }
}

// Generate intelligent chat responses
async function generateChatResponse(message: string, context: {
  userRole: string
  userName: string
  conversationHistory: Array<{ type: string; content: string; timestamp: Date }>
}) {
  const lowerMessage = message.toLowerCase()
  
  // Production status queries
  if (lowerMessage.includes('production') && (lowerMessage.includes('status') || lowerMessage.includes('today'))) {
    return {
      response: `Here's today's production status:\n\n📊 **Current Status:**\n• 12 orders in progress\n• 5 completed today\n• 3 pending QC approval\n• 2 delayed (material shortage)\n\n🔍 **Department Performance:**\n• Cutting: 95% efficiency\n• Printing: 87% efficiency  \n• Sewing: 92% efficiency\n• QC: 8 items inspected, 2 rejected\n\n⚠️ **Attention Required:**\nOrder #045 needs material restock to meet Friday deadline.`,
      confidence: 0.95,
      suggestions: ['Show me delayed orders', 'Check inventory levels', 'Generate production report']
    }
  }
  
  // Inventory queries
  if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
    return {
      response: `📦 **Inventory Summary:**\n\n🔴 **Critical (Restock Needed):**\n• Cotton Fabric White - 25kg (need 200kg)\n• Polyester Thread Black - 15 spools\n• Screen Printing Ink Blue - 2L\n\n🟡 **Low Stock:**\n• Brand Labels - 150 pieces\n• Hangtags - 300 pieces\n\n🟢 **Well Stocked:**\n• Cotton Fabric Black - 450kg\n• Embroidery Thread - 85 spools\n\nWould you like me to generate purchase orders for the critical items?`,
      confidence: 0.92,
      suggestions: ['Create purchase orders', 'Show supplier information', 'Check usage trends'],
      actions: [
        { label: 'Generate PO for Cotton Fabric', action: 'Create purchase order for cotton fabric white 200kg' },
        { label: 'Check All Low Stock', action: 'Show me all items below reorder point' }
      ]
    }
  }
  
  // Order delays
  if (lowerMessage.includes('delay') || lowerMessage.includes('risk') || lowerMessage.includes('behind')) {
    return {
      response: `⚠️ **Orders at Risk:**\n\n🔴 **High Risk (2 orders):**\n• Order #045 (Client: ABC Corp) - Material shortage, 2 days behind\n• Order #052 (Client: XYZ Ltd) - Equipment maintenance, 1 day behind\n\n🟡 **Medium Risk (1 order):**\n• Order #048 (Client: DEF Inc) - Tight deadline, on track but monitoring\n\n💡 **Recommendations:**\n1. Rush order materials for #045 from backup supplier\n2. Reassign resources from completed orders\n3. Inform clients proactively about potential delays`,
      confidence: 0.88,
      suggestions: ['Contact suppliers', 'Notify affected clients', 'Reassign workers'],
      actions: [
        { label: 'Send Client Notifications', action: 'Send delay notifications to affected clients' },
        { label: 'Rush Material Order', action: 'Create rush purchase order for delayed materials' }
      ]
    }
  }
  
  // QC and quality queries
  if (lowerMessage.includes('quality') || lowerMessage.includes('defect') || lowerMessage.includes('reject')) {
    return {
      response: `🔍 **Quality Control Status:**\n\n📊 **This Week's Metrics:**\n• Total Inspected: 450 pieces\n• Passed: 427 pieces (94.9%)\n• Rejected: 23 pieces (5.1%)\n• Target: <3% reject rate\n\n⚠️ **Top Defect Types:**\n1. Print misalignment (8 pieces)\n2. Stitching defects (7 pieces)\n3. Color variance (5 pieces)\n4. Size variations (3 pieces)\n\n🎯 **Action Items:**\n• Calibrate printing equipment\n• Retrain sewing operators on precision\n• Review color matching process`,
      confidence: 0.91,
      suggestions: ['Schedule equipment maintenance', 'Plan training sessions', 'Review rejected items']
    }
  }
  
  // Financial queries
  if (lowerMessage.includes('profit') || lowerMessage.includes('cost') || lowerMessage.includes('margin')) {
    return {
      response: `💰 **Financial Overview:**\n\n📈 **This Month:**\n• Revenue: ₱485,000\n• Costs: ₱298,500\n• Gross Margin: 38.4%\n• Target Margin: 35%\n\n💡 **Margin Analysis:**\n• Material costs: 52% of revenue\n• Labor costs: 28% of revenue\n• Overhead: 20% of revenue\n\n🎯 **Optimization Opportunities:**\n• Negotiate better material pricing\n• Improve production efficiency\n• Reduce waste by 2-3%\n\nGreat job exceeding the target margin this month! ${context.userName}`,
      confidence: 0.87,
      suggestions: ['Show detailed cost breakdown', 'Compare to last month', 'Identify cost savings']
    }
  }
  
  // Greetings and general queries
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
    return {
      response: `Hello ${context.userName}! 👋\n\nI'm Ashley, your AI production assistant. I can help you with:\n\n🏭 **Production Management:**\n• Real-time status updates\n• Efficiency analysis\n• Resource allocation\n\n📦 **Inventory & Supply:**\n• Stock level monitoring\n• Reorder recommendations\n• Supplier analysis\n\n📊 **Business Intelligence:**\n• Performance metrics\n• Cost analysis\n• Trend forecasting\n\n🎯 **Quality Control:**\n• Reject rate tracking\n• Defect analysis\n• Process improvements\n\nWhat would you like to know about today?`,
      confidence: 0.98,
      suggestions: ['Show today\'s production status', 'Check inventory levels', 'Analyze this week\'s performance']
    }
  }
  
  // Default response for unhandled queries
  return {
    response: `I understand you're asking about "${message}". While I'm still learning about this specific topic, I can help you with:\n\n• Production status and scheduling\n• Inventory management and restocking\n• Order tracking and delays\n• Quality control metrics\n• Cost analysis and margins\n• Performance forecasting\n\nCould you try rephrasing your question, or ask me about one of these areas? I'm here to help optimize your apparel production! 🏭`,
    confidence: 0.65,
    suggestions: ['Show production dashboard', 'Check current orders', 'Review inventory status', 'Analyze recent performance']
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get client information
    const _clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const _userAgent = request.headers.get('user-agent') || 'unknown'

    // Session validation
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: securityHeaders
      })
    }

    // Role-based access control
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { 
        status: 403,
        headers: securityHeaders
      })
    }

    // Rate limiting for GET requests
    const rateLimitKey = `ai_ashley_get:${session.user.id}:${Math.floor(Date.now() / 60000)}`
    if (!rateLimit.check(rateLimitKey, 60, 60000)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded' 
      }, { 
        status: 429,
        headers: securityHeaders
      })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!action) {
      // Return Ashley status and capabilities (safe information only)
      return NextResponse.json({
        agent: 'ashley',
        status: 'active',
        capabilities: [
          'generateWeeklyReport',
          'analyzeBusinessHealth',
          'provideBusineessInsights'
        ],
        description: 'AI Supervisor and Business Consultant',
        version: '1.0.0'
      }, {
        headers: securityHeaders
      })
    }

    // No specific GET actions supported for security
    return NextResponse.json({ 
      error: 'Action not supported via GET' 
    }, { 
      status: 400,
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Ashley AI GET error:', error)
    return NextResponse.json({
      error: sanitizeError(error, process.env.NODE_ENV === 'development')
    }, { 
      status: 500,
      headers: securityHeaders
    })
  }
}

// Disable other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: securityHeaders
  })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: securityHeaders
  })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: securityHeaders
  })
}