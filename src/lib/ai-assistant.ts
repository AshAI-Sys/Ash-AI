import { ashAI, type OrderData } from './ai-engine'
// Enhanced ASH AI Assistant - More accurate and intelligent responses


export interface AIAssistantContext {
  currentPage?: string
  userRole?: string
  orders?: OrderData[]
  systemStats?: any
  recentActivity?: any[]
}

export interface AIResponse {
  content: string
  confidence: number
  suggestions: string[]
  actions: Array<{
    label: string
    type: 'navigate' | 'execute' | 'analyze' | 'create'
    data?: any
  }>
  context: string
}

export class EnhancedAIAssistant {
  private knowledgeBase = {
    // Production processes
    production: {
      silkscreen: {
        process: 'Screen printing using mesh screens and ink',
        timePerUnit: '0.5-1 minutes per piece',
        complexity: 'Low to Medium',
        bestFor: 'Large quantities, simple designs, cotton fabrics',
        limitations: 'Limited color gradients, setup time for screens'
      },
      dtf: {
        process: 'Direct-to-Film transfer using special films and powder',
        timePerUnit: '0.7-1.2 minutes per piece',
        complexity: 'Medium',
        bestFor: 'Complex designs, photo-quality prints, mixed fabrics',
        limitations: 'Higher cost per unit, requires special equipment'
      },
      sublimation: {
        process: 'Heat transfer using sublimation inks on polyester',
        timePerUnit: '0.9-1.5 minutes per piece',
        complexity: 'Medium to High',
        bestFor: 'Full-color designs, polyester/poly-blend fabrics',
        limitations: 'Only works on light-colored polyester'
      },
      embroidery: {
        process: 'Machine stitching using threads',
        timePerUnit: '1.2-2.5 minutes per piece',
        complexity: 'High',
        bestFor: 'Premium finish, logos, text, long-lasting',
        limitations: 'Limited detail, higher cost, longer production time'
      }
    },

    // Business intelligence
    kpis: {
      onTimeDelivery: 'Percentage of orders delivered on or before deadline',
      qualityRate: 'Percentage of products passing quality control',
      efficiency: 'Actual production time vs. standard time',
      utilization: 'Equipment and labor capacity usage percentage',
      profitability: 'Revenue minus costs divided by revenue'
    },

    // Common issues and solutions
    troubleshooting: {
      delays: [
        'Check current capacity utilization',
        'Review operator efficiency metrics',
        'Identify bottlenecks in production flow',
        'Consider overtime or outsourcing',
        'Prioritize high-value or urgent orders'
      ],
      quality: [
        'Implement additional QC checkpoints',
        'Review operator training needs',
        'Check equipment calibration',
        'Analyze defect patterns',
        'Improve material quality'
      ],
      capacity: [
        'Analyze historical demand patterns',
        'Consider flexible staffing options',
        'Evaluate equipment upgrades',
        'Implement lean manufacturing principles',
        'Develop outsourcing partnerships'
      ]
    }
  }

  // Enhanced natural language processing for business context
  public async processQuery(query: string, context: AIAssistantContext): Promise<AIResponse> {
    const normalizedQuery = query.toLowerCase().trim()
    const confidence = 85
    const content = ''
    const suggestions: string[] = []
    const actions: AIResponse['actions'] = []
    const responseContext = 'general'

    // Order-related queries
    if (this.isOrderQuery(normalizedQuery)) {
      return this.handleOrderQuery(normalizedQuery, context)
    }

    // Production queries
    if (this.isProductionQuery(normalizedQuery)) {
      return this.handleProductionQuery(normalizedQuery, context)
    }

    // Analytics and reporting queries
    if (this.isAnalyticsQuery(normalizedQuery)) {
      return this.handleAnalyticsQuery(normalizedQuery, context)
    }

    // Problem-solving queries
    if (this.isProblemQuery(normalizedQuery)) {
      return this.handleProblemQuery(normalizedQuery, context)
    }

    // Pricing and business queries
    if (this.isPricingQuery(normalizedQuery)) {
      return this.handlePricingQuery(normalizedQuery, context)
    }

    // Default intelligent response
    return this.generateIntelligentDefault(query, context)
  }

  private isOrderQuery(query: string): boolean {
    const orderKeywords = ['order', 'delivery', 'deadline', 'client', 'status', 'shipment', 'due', 'complete']
    return orderKeywords.some(keyword => query.includes(keyword))
  }

  private handleOrderQuery(query: string, context: AIAssistantContext): AIResponse {
    let content = ''
    let suggestions: string[] = []
    let actions: AIResponse['actions'] = []
    const confidence = 90

    if (context.orders && context.orders.length > 0) {
      const orders = context.orders

      if (query.includes('delay') || query.includes('late')) {
        const delayedOrders = orders.filter(order => {
          const prediction = ashAI.predictDeliveryDate(order)
          const _targetDate = new Date(order.targetDeliveryDate)
          const predictedDate = new Date(prediction.estimatedDate)
          return predictedDate > targetDate
        })

        content = `I've analyzed your orders and found ${delayedOrders.length} orders at risk of delays. `
        
        if (delayedOrders.length > 0) {
          content += `Here are the main concerns:\n\n`
          delayedOrders.slice(0, 3).forEach((order, i) => {
            const prediction = ashAI.predictDeliveryDate(order)
            content += `• Order ${order.id}: ${prediction.risks.join(', ')}\n`
          })

          suggestions = [
            'Review production capacity',
            'Consider prioritizing urgent orders',
            'Negotiate deadline extensions',
            'Add overtime shifts'
          ]

          actions = [
            { label: 'View Order Details', type: 'navigate', data: { page: '/orders' } },
            { label: 'Analyze Production Capacity', type: 'analyze', data: { type: 'capacity' } }
          ]
        } else {
          content += 'All orders are on track for on-time delivery! 🎉'
        }
      }

      else if (query.includes('urgent') || query.includes('priority')) {
        const urgentOrders = orders.filter(order => order.priority === 'HIGH')
        content = `You have ${urgentOrders.length} high-priority orders requiring attention. `
        
        if (urgentOrders.length > 0) {
          content += 'I recommend:\n\n'
          content += '• Schedule these orders for immediate production\n'
          content += '• Assign your most experienced operators\n'
          content += '• Implement extra quality checkpoints\n'
          content += '• Set up automated status notifications'
        }

        suggestions = ['View urgent orders', 'Update production schedule', 'Notify production team']
      }

      else if (query.includes('revenue') || query.includes('profit')) {
        const totalRevenue = orders.reduce((sum, order) => {
          const pricing = ashAI.recommendPricing(order)
          return sum + (pricing.suggestedPrice * order.totalQty)
        }, 0)

        content = `Based on AI-optimized pricing analysis:\n\n`
        content += `• Total Revenue Potential: ₱${totalRevenue.toLocaleString()}\n`
        content += `• Average Order Value: ₱${Math.round(totalRevenue / orders.length).toLocaleString()}\n`
        content += `• Optimization Opportunity: 15-25% increase possible through better pricing`

        actions = [
          { label: 'View Pricing Analysis', type: 'analyze', data: { type: 'pricing' } },
          { label: 'Update Order Prices', type: 'navigate', data: { page: '/orders' } }
        ]
      }
    } else {
      content = "I don't see any orders in the current context. Would you like me to help you create a new order or navigate to the orders page?"
      actions = [
        { label: 'Create New Order', type: 'navigate', data: { page: '/orders/new' } },
        { label: 'View All Orders', type: 'navigate', data: { page: '/orders' } }
      ]
    }

    return { content, confidence, suggestions, actions, context: 'orders' }
  }

  private handleProductionQuery(query: string, context: AIAssistantContext): AIResponse {
    let content = ''
    let suggestions: string[] = []
    let actions: AIResponse['actions'] = []
    const confidence = 88

    if (query.includes('silkscreen') || query.includes('screen print')) {
      const method = this.knowledgeBase.production.silkscreen
      content = `**Silkscreen Printing Analysis:**\n\n`
      content += `• **Process**: ${method.process}\n`
      content += `• **Time**: ${method.timePerUnit}\n`
      content += `• **Best For**: ${method.bestFor}\n`
      content += `• **Considerations**: ${method.limitations}`

      if (context.orders) {
        const silkscreenOrders = context.orders.filter(order => order.method === 'SILKSCREEN')
        if (silkscreenOrders.length > 0) {
          content += `\n\n**Current Silkscreen Orders**: ${silkscreenOrders.length} orders`
          const totalQty = silkscreenOrders.reduce((sum, order) => sum + order.totalQty, 0)
          content += `\n**Total Quantity**: ${totalQty} pieces`
        }
      }

      suggestions = ['Optimize screen setup', 'Check ink inventory', 'Review operator scheduling']
    }

    else if (query.includes('capacity') || query.includes('utilization')) {
      if (context.orders) {
        const resourceAllocation = ashAI.allocateResources(context.orders)
        content = `**Production Capacity Analysis:**\n\n`
        content += `• **Current Efficiency**: ${Math.round(resourceAllocation.efficiency)}%\n`
        content += `• **Recommendations**:\n`
        resourceAllocation.recommendations.forEach(rec => {
          content += `  - ${rec}\n`
        })

        suggestions = ['Add overtime shifts', 'Cross-train operators', 'Optimize workflow']
        actions = [
          { label: 'View Production Schedule', type: 'navigate', data: { page: '/production' } },
          { label: 'Analyze Bottlenecks', type: 'analyze', data: { type: 'bottlenecks' } }
        ]
      }
    }

    else if (query.includes('quality') || query.includes('defect')) {
      content = `**Quality Control Insights:**\n\n`
      content += `I can help you improve quality through:\n\n`
      content += `• **Predictive Quality Analysis**: Identify orders at risk for quality issues\n`
      content += `• **Operator Performance Tracking**: Monitor individual quality metrics\n`
      content += `• **Process Optimization**: Recommend QC checkpoints\n`
      content += `• **Root Cause Analysis**: Identify common defect patterns`

      suggestions = ['Implement QC checkpoints', 'Review operator training', 'Analyze defect patterns']
    }

    return { content, confidence, suggestions, actions, context: 'production' }
  }

  private handleAnalyticsQuery(query: string, context: AIAssistantContext): AIResponse {
    let content = ''
    let suggestions: string[] = []
    let actions: AIResponse['actions'] = []
    const confidence = 92

    if (query.includes('kpi') || query.includes('metrics') || query.includes('performance')) {
      content = `**Key Performance Indicators:**\n\n`
      Object.entries(this.knowledgeBase.kpis).forEach(([key, description]) => {
        content += `• **${key.replace(/([A-Z])/g, ' $1').trim()}**: ${description}\n`
      })

      if (context.orders && context.orders.length > 0) {
        const onTimeOrders = context.orders.filter(order => {
          const prediction = ashAI.predictDeliveryDate(order)
          const _targetDate = new Date(order.targetDeliveryDate)
          const predictedDate = new Date(prediction.estimatedDate)
          return predictedDate <= targetDate
        })
        
        const onTimeRate = Math.round((onTimeOrders.length / context.orders.length) * 100)
        content += `\n**Current On-Time Delivery Rate**: ${onTimeRate}%`
      }

      suggestions = ['Generate KPI report', 'Set performance targets', 'Create alerts']
      actions = [
        { label: 'View Analytics Dashboard', type: 'navigate', data: { page: '/analytics' } },
        { label: 'Generate Report', type: 'execute', data: { action: 'generate_report' } }
      ]
    }

    else if (query.includes('trend') || query.includes('forecast')) {
      content = `**Business Intelligence & Forecasting:**\n\n`
      content += `Based on current data patterns, I can provide:\n\n`
      content += `• **Demand Forecasting**: Predict future order volumes\n`
      content += `• **Seasonal Trends**: Identify peak production periods\n`
      content += `• **Capacity Planning**: Recommend resource allocation\n`
      content += `• **Revenue Projections**: Estimate future earnings`

      suggestions = ['Analyze seasonal patterns', 'Forecast demand', 'Plan capacity']
    }

    return { content, confidence, suggestions, actions, context: 'analytics' }
  }

  private handleProblemQuery(query: string, context: AIAssistantContext): AIResponse {
    let content = ''
    let suggestions: string[] = []
    let actions: AIResponse['actions'] = []
    const confidence = 85

    if (query.includes('problem') || query.includes('issue') || query.includes('trouble')) {
      content = `**Problem-Solving Assistant:**\n\n`
      content += `I can help diagnose and solve common production issues:\n\n`
      
      if (query.includes('delay')) {
        content += `**For Delivery Delays:**\n`
        this.knowledgeBase.troubleshooting.delays.forEach(solution => {
          content += `• ${solution}\n`
        })
        suggestions = ['Check capacity', 'Review bottlenecks', 'Add resources']
      }
      
      else if (query.includes('quality')) {
        content += `**For Quality Issues:**\n`
        this.knowledgeBase.troubleshooting.quality.forEach(solution => {
          content += `• ${solution}\n`
        })
        suggestions = ['QC analysis', 'Training review', 'Equipment check']
      }
      
      else {
        content += `**Common Solutions:**\n`
        content += `• **Delays**: ${this.knowledgeBase.troubleshooting.delays[0]}\n`
        content += `• **Quality**: ${this.knowledgeBase.troubleshooting.quality[0]}\n`
        content += `• **Capacity**: ${this.knowledgeBase.troubleshooting.capacity[0]}`
        suggestions = ['Diagnose issue', 'Analyze root cause', 'Implement solution']
      }

      actions = [
        { label: 'Run Diagnostics', type: 'analyze', data: { type: 'diagnostics' } },
        { label: 'View System Health', type: 'navigate', data: { page: '/health' } }
      ]
    }

    return { content, confidence, suggestions, actions, context: 'problem-solving' }
  }

  private handlePricingQuery(query: string, context: AIAssistantContext): AIResponse {
    let content = ''
    let suggestions: string[] = []
    let actions: AIResponse['actions'] = []
    const confidence = 90

    content = `**AI-Powered Pricing Intelligence:**\n\n`
    
    if (context.orders && context.orders.length > 0) {
      const pricingAnalysis = context.orders.map(order => ashAI.recommendPricing(order))
      const avgPrice = pricingAnalysis.reduce((sum, p) => sum + p.suggestedPrice, 0) / pricingAnalysis.length
      const avgConfidence = pricingAnalysis.reduce((sum, p) => sum + p.confidence, 0) / pricingAnalysis.length

      content += `• **Average Recommended Price**: ₱${Math.round(avgPrice).toLocaleString()}\n`
      content += `• **Pricing Confidence**: ${Math.round(avgConfidence)}%\n`
      content += `• **Market Position**: Competitive pricing strategy\n\n`

      content += `**Pricing Factors Considered:**\n`
      content += `• Production method complexity\n`
      content += `• Order quantity discounts\n`
      content += `• Client relationship history\n`
      content += `• Market competitive rates\n`
      content += `• Rush order premiums`

      suggestions = ['Optimize pricing strategy', 'Review competitor rates', 'Update price lists']
      actions = [
        { label: 'Generate Pricing Report', type: 'analyze', data: { type: 'pricing' } },
        { label: 'Update Pricing', type: 'navigate', data: { page: '/pricing' } }
      ]
    } else {
      content += `I can provide intelligent pricing recommendations based on:\n\n`
      content += `• **Method Complexity**: Different rates for printing methods\n`
      content += `• **Volume Discounts**: Automatic quantity-based pricing\n`
      content += `• **Market Analysis**: Competitive rate positioning\n`
      content += `• **Client History**: Loyalty and risk adjustments`
    }

    return { content, confidence, suggestions, actions, context: 'pricing' }
  }

  private isProblemQuery(query: string): boolean {
    const problemKeywords = ['problem', 'issue', 'trouble', 'error', 'fix', 'solve', 'help', 'wrong']
    return problemKeywords.some(keyword => query.includes(keyword))
  }

  private isProductionQuery(query: string): boolean {
    const productionKeywords = ['production', 'silkscreen', 'dtf', 'sublimation', 'embroidery', 'capacity', 'efficiency', 'quality', 'process', 'workflow']
    return productionKeywords.some(keyword => query.includes(keyword))
  }

  private isAnalyticsQuery(query: string): boolean {
    const analyticsKeywords = ['analytics', 'report', 'metrics', 'kpi', 'performance', 'trend', 'forecast', 'statistics', 'data']
    return analyticsKeywords.some(keyword => query.includes(keyword))
  }

  private isPricingQuery(query: string): boolean {
    const pricingKeywords = ['price', 'pricing', 'cost', 'quote', 'rate', 'revenue', 'profit', 'margin', 'competitive']
    return pricingKeywords.some(keyword => query.includes(keyword))
  }

  private generateIntelligentDefault(query: string, context: AIAssistantContext): AIResponse {
    const suggestions = [
      'Ask about order status',
      'Check production capacity', 
      'Review pricing strategy',
      'Analyze performance metrics'
    ]

    const actions = [
      { label: 'View Dashboard', type: 'navigate', data: { page: '/dashboard' } },
      { label: 'Ask Different Question', type: 'execute', data: { action: 'clarify' } }
    ]

    let content = `I'm Ashley, your AI assistant for ASH Apparel Studio. I can help you with:\n\n`
    content += `• **Order Management**: Status, delivery predictions, risk analysis\n`
    content += `• **Production Planning**: Capacity, scheduling, optimization\n`
    content += `• **Quality Control**: Defect analysis, process improvement\n`
    content += `• **Business Intelligence**: KPIs, trends, forecasting\n`
    content += `• **Pricing Strategy**: Competitive analysis, profit optimization\n\n`
    content += `What would you like to know about your business today?`

    return {
      content,
      confidence: 95,
      suggestions,
      actions,
      context: 'general'
    }
  }
}

// Singleton instance
export const enhancedAI = new EnhancedAIAssistant()