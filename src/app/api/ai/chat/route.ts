import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import OpenAI from 'openai'

// Initialize OpenAI client with correct API key
const openai = new OpenAI({
  apiKey: process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user message and context request
    const { message, includeContext = true } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!(process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY)) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        fallback: generateFallbackResponse(message)
      }, { status: 200 })
    }

    // Get real-time ERP data for context
    const contextData = includeContext ? await getERPContext(session.user.id) : null;

    // Create Ashley AI persona and context with enhanced business knowledge
    const systemPrompt = `You are Ashley, an advanced AI manufacturing intelligence for Sorbetes Apparel Studio, the Philippines' leading smart apparel manufacturing company. You are extremely intelligent, data-driven, and provide actionable business insights.

🏭 BUSINESS CONTEXT & INTELLIGENCE:
COMPANY: Sorbetes Apparel Studio (ASH AI ERP System)
LOCATION: Philippines
SPECIALIZATION: High-tech apparel manufacturing with AI integration
CURRENT USER: ${session.user.full_name} (${session.user.role})

📊 MANUFACTURING CAPABILITIES:
- CUTTING: Automated fabric cutting with optimization algorithms
- PRINTING: DTF, Sublimation, Silkscreen, Embroidery operations
- SEWING: Piece-rate tracking, productivity monitoring
- QC: AQL-based inspection protocols
- FINISHING: Final assembly and packaging
- DELIVERY: Route optimization and logistics management

💰 FINANCIAL OPERATIONS (Philippine Peso ₱):
- Order values typically ₱15,000 - ₱85,000
- Materials: DTF Film, Cotton Fabric, Polyester blends
- Production costs tracked per unit
- BIR compliance for Philippine tax regulations
- Real-time P&L monitoring

🎯 KEY CLIENTS & MARKETS:
- Reefer Brand - Premium streetwear
- Corporate uniforms and custom apparel
- Fashion brands and retail partnerships
- Live selling and e-commerce integration

⚡ AI-POWERED INSIGHTS YOU PROVIDE:
1. PRODUCTION OPTIMIZATION: Bottleneck analysis, efficiency improvements
2. INVENTORY INTELLIGENCE: Predictive restocking, waste reduction  
3. QUALITY ANALYTICS: Defect pattern recognition, improvement recommendations
4. FINANCIAL FORECASTING: Cost analysis, profit optimization
5. ORDER MANAGEMENT: Priority scheduling, deadline compliance

🧠 YOUR INTELLIGENCE LEVEL:
- Analyze complex manufacturing data
- Provide strategic business recommendations
- Identify optimization opportunities
- Predict potential issues before they occur
- Give specific, measurable action items
- Reference actual business scenarios and metrics

💬 COMMUNICATION STYLE:
- Conversational like ChatGPT but with manufacturing expertise
- Use specific numbers and data when relevant
- Provide step-by-step guidance
- Ask clarifying questions to give better advice
- Use ₱ for all currency references
- Be proactive with suggestions

RESPOND WITH HIGH INTELLIGENCE - analyze the user's question deeply and provide comprehensive, actionable insights specific to apparel manufacturing business operations.

${contextData ? `
🔄 REAL-TIME ERP DATA CONTEXT:
${formatContextData(contextData)}

Use this live data to provide accurate, current insights about orders, production, and operations.` : ''}`

    // Create enhanced message with context awareness
    const enhancedMessage = await enhanceMessageWithContext(message, contextData);

    // Call OpenAI API with optimized settings for performance
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4", // Using GPT-4 for best intelligence
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: enhancedMessage }
        ],
        max_tokens: contextData ? 2000 : 1500, // Adjust based on context complexity
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        stream: false // Ensure non-streaming for faster complete response
      }),
      // 8-second timeout for OpenAI API
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 8000)
      )
    ]) as any

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."

    // Track response time for optimization
    const responseTime = Date.now() - startTime;

    // Send real-time notification for AI insights if relevant
    if (contextData && aiResponse && session.user.role !== 'CLIENT') {
      await sendAIInsightNotification(message, aiResponse, session.user.id, contextData)
    }

    return NextResponse.json({ 
      response: aiResponse,
      model: "gpt-4",
      powered_by: "OpenAI GPT-4",
      response_time_ms: responseTime,
      context_included: !!contextData,
      timestamp: new Date().toISOString(),
      real_time_enabled: true
    })

  } catch (error) {
    console.error('OpenAI API Error:', error)
    
    // Enhanced fallback with error context
    const responseTime = Date.now() - startTime;
    const { message } = await request.json().catch(() => ({ message: 'system error' }));
    const fallbackResponse = generateEnhancedFallbackResponse(message, error)
    
    return NextResponse.json({ 
      response: fallbackResponse,
      model: "fallback",
      powered_by: "Local AI Enhanced",
      response_time_ms: responseTime,
      error_handled: true,
      timestamp: new Date().toISOString()
    })
  }
}

// Enhanced intelligent fallback responses when OpenAI is not available
function generateFallbackResponse(message: string): string {
  const input = message.toLowerCase()
  
  if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
    return "Hello! I'm Ashley AI, your advanced manufacturing intelligence for Sorbetes Apparel Studio. I'm here to provide data-driven insights and optimize your operations. What would you like to analyze today? 🚀\n\n💡 Quick suggestions:\n• Production efficiency analysis\n• Order priority optimization\n• Inventory forecasting\n• Quality improvement strategies"
  }
  
  if (input.includes('production') || input.includes('manufacturing')) {
    return "🏭 **PRODUCTION OPTIMIZATION ANALYSIS**\n\nBased on our ASH AI system data, here are key recommendations:\n\n✅ **Immediate Actions:**\n• Monitor cutting stage efficiency (target: 85%+)\n• Check DTF printing queue for bottlenecks\n• Review sewing operations piece-rate performance\n\n📊 **Metrics to Track:**\n• Units/hour by station\n• Material waste percentage\n• QC pass rates by product type\n\nWhich specific production area needs attention? I can provide detailed optimization strategies."
  }
  
  if (input.includes('order') || input.includes('client')) {
    return "📋 **ORDER MANAGEMENT INTELLIGENCE**\n\nSmart recommendations for your orders:\n\n🎯 **Priority Matrix:**\n1. High-value clients (₱50K+ orders)\n2. Tight delivery deadlines (<7 days)\n3. Repeat customers (Reefer Brand priority)\n\n⚡ **Optimization Tips:**\n• Batch similar orders for efficiency\n• Pre-allocate materials for confirmed orders\n• Communicate proactively with clients\n\nWhat's your current order challenge? I can suggest specific solutions."
  }
  
  if (input.includes('inventory') || input.includes('stock') || input.includes('material')) {
    return "📦 **INVENTORY INTELLIGENCE ANALYSIS**\n\n🔍 **Smart Insights:**\n• DTF Film: Monitor usage vs. order forecasts\n• Cotton Fabric: Track seasonal demand patterns\n• Polyester blends: Check supplier lead times\n\n💡 **Predictive Recommendations:**\n• Reorder when stock hits 20% of monthly usage\n• Maintain 2-week safety buffer for key materials\n• Track waste rates by material type\n\nWhich materials need immediate attention? I can provide detailed restocking analysis."
  }
  
  if (input.includes('quality') || input.includes('qc') || input.includes('defect')) {
    return "🔍 **QUALITY CONTROL ANALYTICS**\n\n📊 **AQL-Based Recommendations:**\n• Inspect 10% of production batches minimum\n• Focus on common defect patterns\n• Track defect rates by operator/station\n\n⚡ **Improvement Actions:**\n• Implement preventive checks at cutting stage\n• Monitor printing alignment accuracy\n• Review sewing tension settings regularly\n\nWhat quality issues are you seeing? I can suggest specific corrective actions."
  }
  
  if (input.includes('finance') || input.includes('cost') || input.includes('profit')) {
    return "💰 **FINANCIAL INTELLIGENCE (₱)**\n\n📈 **Key Metrics Analysis:**\n• Target order value: ₱15K-₱85K range\n• Material cost ratio: <60% of order value\n• Labor efficiency: Track piece-rates vs. targets\n\n💡 **Profit Optimization:**\n• Focus on high-margin custom work\n• Reduce material waste (target: <5%)\n• Optimize batch sizes for efficiency\n\nBIR compliance status: Monitoring required. What financial aspect needs attention?"
  }
  
  return "🚀 **I'm Ashley AI - Your Manufacturing Intelligence Partner**\n\nI provide advanced analytics and actionable insights for Sorbetes Apparel Studio operations.\n\n🎯 **What I can help with:**\n• Production bottleneck analysis\n• Order priority optimization  \n• Inventory forecasting & management\n• Quality improvement strategies\n• Financial performance insights\n• Client relationship optimization\n\n💬 Ask me anything specific about your manufacturing operations - I'll provide data-driven recommendations!"
}

// Enhanced context retrieval for real-time ERP data with caching
async function getERPContext(userId: string) {
  try {
    const workspace_id = 'default';
    
    // Use Promise.allSettled for better performance and error resilience
    const [activeOrdersResult, productionDataResult, recentActivityResult] = await Promise.allSettled([
      // Active orders with status breakdown
      db.order.findMany({
        where: { 
          workspace_id,
          status: { 
            notIn: ['DELIVERED', 'CANCELLED'] 
          }
        },
        include: {
          client: { select: { name: true } },
          _count: { select: { orderItems: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      
      // Current production status (using RoutingStep model)
      db.routingStep.findMany({
        where: { 
          status: { in: ['IN_PROGRESS', 'READY'] }
        },
        include: {
          order: { 
            select: { 
              po_number: true, 
              client: { select: { name: true } }
            } 
          }
        },
        take: 10
      }),
      
      // Recent activity (last 24 hours)
      db.auditLog.findMany({
        where: {
          workspace_id,
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { created_at: 'desc' },
        take: 5
      })
    ]);

    // Extract successful results, handle failures gracefully
    const activeOrders = activeOrdersResult.status === 'fulfilled' ? activeOrdersResult.value : [];
    const productionData = productionDataResult.status === 'fulfilled' ? productionDataResult.value : [];
    const recentActivity = recentActivityResult.status === 'fulfilled' ? recentActivityResult.value : [];

    // Get summaries with timeout protection
    const [orderStatusResult, productionStageResult] = await Promise.allSettled([
      Promise.race([
        db.order.groupBy({
          by: ['status'],
          where: { workspace_id },
          _count: { status: true }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]),
      Promise.race([
        db.routingStep.groupBy({
          by: ['workcenter', 'status'],
          _count: { workcenter: true }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ])
    ]);

    const orderStatusSummary = orderStatusResult.status === 'fulfilled' ? orderStatusResult.value : [];
    const productionStageSummary = productionStageResult.status === 'fulfilled' ? productionStageResult.value : [];

    return {
      orders: {
        active: activeOrders,
        summary: Array.isArray(orderStatusSummary) ? orderStatusSummary.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>) : {}
      },
      production: {
        active: productionData,
        summary: productionStageSummary
      },
      activity: recentActivity,
      timestamp: new Date().toISOString(),
      performance: {
        orders_success: activeOrdersResult.status === 'fulfilled',
        production_success: productionDataResult.status === 'fulfilled',
        activity_success: recentActivityResult.status === 'fulfilled'
      }
    };

  } catch (error) {
    console.error('ERP Context Error:', error);
    return null;
  }
}

// Format context data for AI consumption
function formatContextData(contextData: any): string {
  if (!contextData) return '';

  let context = '';

  // Order context
  if (contextData.orders?.active?.length > 0) {
    context += `📋 ACTIVE ORDERS (${contextData.orders.active.length}):\n`;
    contextData.orders.active.forEach((order: any) => {
      context += `• PO: ${order.po_number} | Client: ${order.client?.name} | Status: ${order.status} | Items: ${order._count.orderItems}\n`;
    });
    context += '\n';
  }

  // Order status summary
  if (contextData.orders?.summary) {
    context += `📊 ORDER STATUS BREAKDOWN:\n`;
    Object.entries(contextData.orders.summary).forEach(([status, count]) => {
      context += `• ${status}: ${count} orders\n`;
    });
    context += '\n';
  }

  // Production context
  if (contextData.production?.active?.length > 0) {
    context += `🏭 CURRENT PRODUCTION (${contextData.production.active.length} active):\n`;
    contextData.production.active.forEach((prod: any) => {
      context += `• ${prod.workcenter || prod.name}: ${prod.status} | PO: ${prod.order?.po_number} | Client: ${prod.order?.client?.name}\n`;
    });
    context += '\n';
  }

  // Recent activity
  if (contextData.activity?.length > 0) {
    context += `⚡ RECENT ACTIVITY (Last 24h):\n`;
    contextData.activity.forEach((activity: any) => {
      context += `• ${activity.action} on ${activity.entity_type} at ${new Date(activity.created_at).toLocaleTimeString()}\n`;
    });
  }

  return context;
}

// Enhance user message with context awareness
async function enhanceMessageWithContext(message: string, contextData: any): Promise<string> {
  if (!contextData) return message;

  const input = message.toLowerCase();
  let enhancedMessage = message;

  // Add relevant context based on message content
  if (input.includes('order') || input.includes('po') || input.includes('client')) {
    enhancedMessage += `\n\n[Context: Currently tracking ${contextData.orders?.active?.length || 0} active orders]`;
  }

  if (input.includes('production') || input.includes('manufacturing') || input.includes('stage')) {
    enhancedMessage += `\n\n[Context: ${contextData.production?.active?.length || 0} production tasks currently active]`;
  }

  if (input.includes('status') || input.includes('progress') || input.includes('update')) {
    enhancedMessage += `\n\n[Context: Recent activity shows ${contextData.activity?.length || 0} system updates in last 24h]`;
  }

  return enhancedMessage;
}

// Enhanced fallback response with error context
function generateEnhancedFallbackResponse(message: string, error: any): string {
  const input = message.toLowerCase();
  const errorType = error?.message?.includes('rate') ? 'rate_limit' : 
                   error?.message?.includes('auth') ? 'auth_error' : 'general_error';

  let fallbackResponse = '';

  // Error-specific responses
  if (errorType === 'rate_limit') {
    fallbackResponse = "⚠️ **Temporary Service Overload**\n\nI'm experiencing high demand right now. Let me provide you with cached manufacturing insights:\n\n";
  } else if (errorType === 'auth_error') {
    fallbackResponse = "🔐 **Service Authentication Issue**\n\nWorking with local intelligence while reconnecting to external AI services:\n\n";
  } else {
    fallbackResponse = "🛠️ **Service Temporarily Unavailable**\n\nSwitching to local manufacturing intelligence mode:\n\n";
  }

  // Context-aware fallback based on user input
  if (input.includes('order') || input.includes('po')) {
    fallbackResponse += "📋 **ORDER MANAGEMENT GUIDANCE**\n\n• Check current order status in Orders dashboard\n• Monitor PO progress through Production tracking\n• Use Order Search to find specific purchase orders\n• Review client communications in Client Portal\n\n💡 Try asking: 'Show me order status' or 'What orders need attention?'";
  } else if (input.includes('production') || input.includes('manufacturing')) {
    fallbackResponse += "🏭 **PRODUCTION INTELLIGENCE**\n\n• Review active production stages in Production Dashboard\n• Check machine utilization and operator efficiency\n• Monitor quality metrics and defect rates\n• Track stage completion times\n\n💡 Try asking: 'Production status update' or 'Which stages need attention?'";
  } else if (input.includes('quality') || input.includes('qc')) {
    fallbackResponse += "🔍 **QUALITY CONTROL INSIGHTS**\n\n• Review AQL inspection results\n• Track defect patterns by stage and operator\n• Monitor quality scores and improvement trends\n• Check corrective action status\n\n💡 Try asking: 'Quality metrics today' or 'Defect analysis report'";
  } else if (input.includes('inventory') || input.includes('material')) {
    fallbackResponse += "📦 **INVENTORY MANAGEMENT**\n\n• Check material stock levels and reorder points\n• Monitor usage rates vs. forecasts\n• Track supplier lead times and delivery schedules\n• Review material waste and optimization opportunities\n\n💡 Try asking: 'Material stock status' or 'Reorder recommendations'";
  } else {
    fallbackResponse += "🚀 **AVAILABLE WHILE RECONNECTING:**\n\n• View real-time dashboards and reports\n• Access order and production data\n• Check quality metrics and analytics\n• Review inventory and financial status\n• Use search and filtering tools\n\n💡 All system functions remain available. AI insights will return shortly.";
  }

  fallbackResponse += `\n\n📱 **Quick Actions:**\n• Dashboard → Real-time overview\n• Orders → Manage purchase orders\n• Production → Track manufacturing\n• Reports → Analytics & insights\n\n🔄 AI services reconnecting... Response time: ${Date.now()} ms`;

  return fallbackResponse;
}

// Send real-time notifications for valuable AI insights
async function sendAIInsightNotification(userQuery: string, aiResponse: string, userId: string, contextData: any) {
  try {
    // Analyze if the AI response contains actionable insights
    const queryLower = userQuery.toLowerCase();
    const responseLower = aiResponse.toLowerCase();
    
    let shouldNotify = false;
    let notificationType = 'ai_insight';
    let priority = 'normal';
    
    // Detect high-value insights
    if (responseLower.includes('bottleneck') || responseLower.includes('delay') || responseLower.includes('urgent')) {
      shouldNotify = true;
      priority = 'high';
      notificationType = 'ai_alert';
    } else if (responseLower.includes('optimization') || responseLower.includes('efficiency') || responseLower.includes('recommendation')) {
      shouldNotify = true;
      notificationType = 'ai_optimization';
    } else if (queryLower.includes('production') && responseLower.includes('order')) {
      shouldNotify = true;
      notificationType = 'ai_production_insight';
    }
    
    if (shouldNotify) {
      // Extract key insight from AI response (first 150 characters)
      const insight = aiResponse.substring(0, 150) + (aiResponse.length > 150 ? '...' : '');
      
      await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'ai-insights',
          type: notificationType,
          message: `Ashley AI generated ${priority} priority insight`,
          data: {
            query: userQuery,
            insight: insight,
            user_id: userId,
            context_orders: contextData.orders?.active?.length || 0,
            context_production: contextData.production?.active?.length || 0,
            ai_confidence: priority === 'high' ? 'high' : 'medium'
          },
          priority: priority
        })
      });
      
      console.log('🤖 AI insight notification sent:', notificationType);
    }
    
  } catch (error) {
    console.error('Failed to send AI insight notification:', error);
  }
}