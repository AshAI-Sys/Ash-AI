import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.object({
    previousMessages: z.array(z.string()).optional(),
    clientInfo: z.object({
      name: z.string().optional(),
      email: z.string().optional()
    }).optional()
  }).optional()
})

interface ChatResponse {
  message: string
  suggestedActions?: string[]
  requiresHuman?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context } = chatSchema.parse(body)

    const response = generateAshleyResponse(message, context)

    return NextResponse.json({
      success: true,
      response
    })

  } catch (_error) {
    console.error('Chatbot error:', _error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Chatbot service temporarily unavailable' 
      },
      { status: 500 }
    )
  }
}

function generateAshleyResponse(message: string, context?: any): ChatResponse {
  const lowerMessage = message.toLowerCase()
  
  // Greeting patterns
  if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
    return {
      message: "Hello! I'm Ashley, your AI assistant for Sorbetes Apparel Studio. I'm here to help you with custom apparel solutions, quotes, and any questions about our services. How can I assist you today?",
      suggestedActions: [
        "Get a quote",
        "View our services", 
        "Check pricing",
        "Learn about delivery"
      ]
    }
  }

  // Pricing and cost inquiries
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote') || lowerMessage.includes('how much')) {
    return {
      message: "Our pricing is competitive and depends on several factors:\n\n📊 **T-Shirt Printing:**\n• Screen Printing: ₱150-300/piece\n• DTF/Sublimation: ₱200-400/piece\n• Embroidery: ₱250-450/piece\n\n💰 **Bulk Discounts:**\n• 50+ pieces: 15% off\n• 100+ pieces: 25% off\n• 500+ pieces: 35% off\n\nWould you like a personalized quote? I can connect you with our team for exact pricing based on your specific needs.",
      suggestedActions: [
        "Get personalized quote",
        "View bulk pricing",
        "Compare printing methods",
        "Talk to sales team"
      ]
    }
  }

  // Delivery and shipping
  if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping') || lowerMessage.includes('deliver')) {
    return {
      message: "🚚 **Delivery Options:**\n\n📍 **Metro Manila:**\n• FREE delivery for orders ₱5,000+\n• Same-day delivery available\n• Standard: 1-2 business days\n\n🏝️ **Provincial:**\n• LBC/2GO courier services\n• 3-5 business days\n• Shipping cost based on location\n\n⚡ **Rush Orders:**\n• 24-48 hours available\n• Additional 50% rush fee\n\nWhat's your location and preferred timeline?",
      suggestedActions: [
        "Calculate shipping cost",
        "Rush order inquiry",
        "Delivery schedule",
        "Track existing order"
      ]
    }
  }

  // Design services
  if (lowerMessage.includes('design') || lowerMessage.includes('artwork') || lowerMessage.includes('logo')) {
    return {
      message: "🎨 **Design Services:**\n\n✨ **What we offer:**\n• FREE basic design consultation\n• Custom artwork creation\n• Logo design and branding\n• Unlimited revisions until perfect\n• Vector file delivery\n\n💡 **Design Process:**\n1. Share your concept/brief\n2. Our artists create initial designs\n3. Review and request changes\n4. Final approval and printing\n\nDo you have existing artwork or need us to create something from scratch?",
      suggestedActions: [
        "Upload existing design",
        "Request custom design",
        "View design portfolio",
        "Design consultation"
      ]
    }
  }

  // Minimum order quantities
  if (lowerMessage.includes('minimum') || lowerMessage.includes('moq') || lowerMessage.includes('small order')) {
    return {
      message: "📦 **Minimum Order Quantities:**\n\n✅ **Very Flexible MOQs:**\n• DTF/Sublimation: 5 pieces\n• Screen Printing: 10 pieces\n• Embroidery: 20 pieces\n• Corporate orders: No minimum!\n\n🎯 **Perfect for:**\n• Small businesses\n• Startups\n• Events and teams\n• Personal projects\n• Corporate uniforms\n\nWe cater to orders of any size. What quantity are you considering?",
      suggestedActions: [
        "Small order quote",
        "Bulk order pricing",
        "Corporate packages",
        "Event specials"
      ]
    }
  }

  // Services and capabilities
  if (lowerMessage.includes('service') || lowerMessage.includes('what do you') || lowerMessage.includes('capabilities')) {
    return {
      message: "🏭 **Our Services:**\n\n👕 **Apparel Types:**\n• T-shirts, Polo shirts, Hoodies\n• Uniforms, Jackets, Caps\n• Bags, Aprons, Custom items\n\n🖨️ **Printing Methods:**\n• Screen Printing (bulk orders)\n• DTF (detailed, colorful designs)\n• Sublimation (all-over prints)\n• Embroidery (premium finish)\n\n🏢 **Specializing in:**\n• Corporate uniforms\n• Event merchandise\n• Promotional items\n• Sports team apparel\n\nWhat type of project are you working on?",
      suggestedActions: [
        "Corporate uniforms",
        "Event merchandise",
        "Sports apparel",
        "Promotional items"
      ]
    }
  }

  // Timeline and turnaround
  if (lowerMessage.includes('timeline') || lowerMessage.includes('turnaround') || lowerMessage.includes('when') || lowerMessage.includes('deadline')) {
    return {
      message: "⏰ **Production Timeline:**\n\n🎯 **Standard Orders:**\n• Design approval: 1-2 days\n• Production: 5-7 days\n• Quality check: 1 day\n• Delivery: 1-3 days\n\n⚡ **Rush Service:**\n• 24-48 hours possible\n• Subject to design complexity\n• Additional fees apply\n\n📅 **Planning Tip:**\n• Contact us 2 weeks before your event\n• Earlier for large orders (500+)\n\nWhen do you need your order ready?",
      suggestedActions: [
        "Rush order inquiry",
        "Schedule consultation",
        "Production calendar",
        "Deadline planning"
      ]
    }
  }

  // Quality and materials
  if (lowerMessage.includes('quality') || lowerMessage.includes('material') || lowerMessage.includes('fabric')) {
    return {
      message: "🌟 **Quality Promise:**\n\n👕 **Premium Materials:**\n• 100% cotton shirts\n• Poly-cotton blends\n• Moisture-wicking fabrics\n• Eco-friendly options\n\n🎖️ **Quality Control:**\n• Pre-production samples\n• In-process inspections\n• Final quality check\n• 99% satisfaction rate\n\n🔄 **Guarantee:**\n• Free reprints for defects\n• Color accuracy promise\n• Durability tested\n\nQuality is our top priority. Any specific material preferences?",
      suggestedActions: [
        "Material samples",
        "Quality guarantees",
        "Eco-friendly options",
        "Fabric comparison"
      ]
    }
  }

  // Contact and support
  if (lowerMessage.includes('contact') || lowerMessage.includes('talk to human') || lowerMessage.includes('representative')) {
    return {
      message: "📞 **Contact Our Team:**\n\n👥 **Talk to Humans:**\n• Phone: +63 xxx xxx xxxx\n• Email: hello@sorbetesapparel.com\n• Live chat: Available 9AM-6PM\n\n🏢 **Visit Our Shop:**\n• 123 Fashion Street, Metro Manila\n• Monday-Friday: 8AM-6PM\n• Saturday: 9AM-5PM\n\n💬 **Or continue chatting with me!**\nI can help with quotes, information, and connecting you with the right team member.",
      requiresHuman: true,
      suggestedActions: [
        "Call now",
        "Schedule visit",
        "Email inquiry",
        "Continue with Ashley"
      ]
    }
  }

  // Default response with helpful suggestions
  return {
    message: "I'd be happy to help you with that! Sorbetes Apparel Studio specializes in custom apparel with premium quality and excellent service.\n\n🎯 **I can help you with:**\n• Pricing and quotes\n• Design services\n• Delivery options\n• Order requirements\n• Material information\n\nCould you tell me more about what you're looking for? Or choose one of the options below:",
    suggestedActions: [
      "Get pricing quote",
      "Design services",
      "Delivery info",
      "Talk to sales team"
    ]
  }
}