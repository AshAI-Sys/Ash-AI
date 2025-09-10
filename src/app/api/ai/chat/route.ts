import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

// Initialize OpenAI client with correct API key
const openai = new OpenAI({
  apiKey: process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user message
    const { message } = await request.json()
    
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

RESPOND WITH HIGH INTELLIGENCE - analyze the user's question deeply and provide comprehensive, actionable insights specific to apparel manufacturing business operations.`

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-latest", // Using GPT-4o latest for best intelligence
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."

    return NextResponse.json({ 
      response: aiResponse,
      model: "gpt-4o-latest",
      powered_by: "OpenAI GPT-4o Latest"
    })

  } catch (_error) {
    console.error('OpenAI API Error:', _error)
    
    // Fallback to smart local response if OpenAI fails
    const { message } = await request.json()
    const fallbackResponse = generateFallbackResponse(message)
    
    return NextResponse.json({ 
      response: fallbackResponse,
      model: "fallback",
      powered_by: "Local AI"
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