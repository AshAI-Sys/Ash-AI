import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
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

    // Create Ashley AI persona and context
    const systemPrompt = `You are Ashley, an advanced AI assistant for Sorbetes Apparel Studio, a Philippine apparel manufacturing company. You are intelligent, helpful, and professional.

CONTEXT ABOUT THE BUSINESS:
- Sorbetes Apparel Studio is a manufacturing company in the Philippines
- We handle orders, production, sewing, printing, quality control, and delivery
- We serve clients like Reefer Brand and other apparel companies
- We use materials like DTF Film, Cotton Fabric, etc.
- Current user: ${session.user.full_name} (Role: ${session.user.role})

YOUR PERSONALITY:
- Professional but friendly
- Data-driven and analytical
- Helpful with manufacturing insights
- Use Philippine Peso (₱) for currency
- Knowledgeable about apparel manufacturing
- Provide specific, actionable advice

RESPOND AS:
- A smart manufacturing assistant
- Give real business insights when possible
- Be conversational like ChatGPT
- Use emojis sparingly but appropriately
- Keep responses helpful and relevant to apparel manufacturing

Current conversation:`

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

// Fallback smart response when OpenAI is not available
function generateFallbackResponse(message: string): string {
  const input = message.toLowerCase()
  
  if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
    return "Hello! I'm Ashley AI, your manufacturing assistant. How can I help optimize your operations today? 👋"
  }
  
  if (input.includes('production') || input.includes('manufacturing')) {
    return "I can help optimize your production! Based on typical apparel manufacturing, I suggest monitoring efficiency rates, checking for bottlenecks in cutting/sewing/printing stages, and ensuring quality control. What specific area would you like to focus on?"
  }
  
  if (input.includes('order') || input.includes('client')) {
    return "For order management, I recommend prioritizing by delivery dates, client importance, and production capacity. Would you like me to help with order scheduling or client communication?"
  }
  
  if (input.includes('inventory') || input.includes('stock')) {
    return "For inventory management, I suggest tracking material usage rates, predicting reorder points, and monitoring slow-moving stock. What materials do you need help managing?"
  }
  
  return "I'm here to help with your apparel manufacturing needs! I can assist with production optimization, order management, inventory tracking, quality control, and more. What specific challenge are you facing today?"
}