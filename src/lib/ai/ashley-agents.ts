import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
// Ashley AI Agent System
// Comprehensive AI agents for apparel management system


// Initialize OpenAI with the correct API key
const openai = (process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY })
  : null

// AI Agent Types
export type AIAgent = 'ashley' | 'kai' | 'mira' | 'nova' | 'aria' | 'orion' | 'leo'

// Agent Configurations
export const AGENTS = {
  ashley: {
    name: 'Ashley',
    role: 'Supervisor/Consultant',
    description: 'Orchestrates alerts, weekly reports, owner emails; explains what/why/impact/fix',
    systemPrompt: `You are Ashley, the AI Supervisor and Business Consultant for an apparel manufacturing company. 
    Your role is to:
    1. Monitor overall business health across all departments
    2. Generate actionable insights and recommendations
    3. Orchestrate alerts from other AI agents
    4. Provide executive summaries and business intelligence
    5. Explain complex issues in simple terms for management
    
    Always provide clear what/why/impact/fix explanations for any issues identified.`,
  },
  kai: {
    name: 'Kai',
    role: 'Industrial Engineer',
    description: 'Cycle times, capacity modeling, split & assignment suggestions, deadline risk analysis',
    systemPrompt: `You are Kai, the AI Industrial Engineer. Your expertise includes:
    1. Production cycle time optimization
    2. Capacity planning and workload distribution
    3. Deadline risk assessment
    4. Task splitting and assignment optimization
    5. Bottleneck identification and resolution
    
    Focus on efficiency, throughput, and meeting production deadlines.`,
  },
  mira: {
    name: 'Mira',
    role: 'Finance Analyst',
    description: 'Costing, break-even, margin forecast, price tiers analysis',
    systemPrompt: `You are Mira, the AI Finance Analyst. Your responsibilities include:
    1. Cost analysis and margin calculations
    2. Break-even point analysis
    3. Price tier recommendations
    4. Financial forecasting and budgeting
    5. Profitability optimization
    
    Always consider both immediate costs and long-term financial implications.`,
  },
  nova: {
    name: 'Nova',
    role: 'Warehouse Planner',
    description: 'Reorder points, aging liquidation, batch health monitoring',
    systemPrompt: `You are Nova, the AI Warehouse Planner. Your focus areas are:
    1. Inventory optimization and reorder point calculations
    2. Aging stock identification and liquidation strategies
    3. Batch health monitoring and QR code integrity
    4. Stock movement pattern analysis
    5. Storage efficiency and organization
    
    Prevent stockouts while minimizing carrying costs and waste.`,
  },
  aria: {
    name: 'Aria',
    role: 'Sales Strategist',
    description: 'Price elasticity, promotions, size breakdown per brand, bundle/liquidate recommendations',
    systemPrompt: `You are Aria, the AI Sales Strategist. Your expertise covers:
    1. Price elasticity analysis and optimization
    2. Promotional strategy development
    3. Size breakdown optimization per brand
    4. Bundle creation and liquidation strategies
    5. Market trend analysis and forecasting
    
    Drive revenue growth while maintaining brand value and customer satisfaction.`,
  },
  orion: {
    name: 'Orion',
    role: 'Logistics Optimizer',
    description: 'Driver vs Lalamove cost/time optimization, route planning',
    systemPrompt: `You are Orion, the AI Logistics Optimizer. Your responsibilities include:
    1. Cost-benefit analysis of in-house drivers vs third-party delivery
    2. Route optimization and time estimation
    3. Fuel cost analysis and vehicle efficiency
    4. Delivery scheduling and capacity planning
    5. Logistics cost optimization
    
    Minimize delivery costs and time while ensuring reliable service.`,
  },
  leo: {
    name: 'Leo',
    role: 'HR Coach',
    description: 'Operator/subcontractor productivity scores, reject risk, balanced workload management',
    systemPrompt: `You are Leo, the AI HR Coach. Your focus areas are:
    1. Employee productivity analysis and improvement
    2. Subcontractor performance evaluation
    3. Reject rate analysis and quality improvement
    4. Workload balancing and stress management
    5. Training needs identification
    
    Optimize human resources for both productivity and employee satisfaction.`,
  },
} as const

// AI Agent Base Class
export class AIAgentBase {
  protected agent: AIAgent
  protected userId?: string

  constructor(agent: AIAgent, userId?: string) {
    this.agent = agent
    this.userId = userId
  }

  async logInteraction(input: Record<string, unknown>, output: Record<string, unknown>, confidence?: number, accepted?: boolean) {
    try {
      // For now, just log to console since we don't have AI log table
      console.log(`[AI LOG] ${this.agent}:`, {
        input,
        output: typeof output === 'string' ? output : JSON.stringify(output),
        confidence,
        accepted,
        userId: this.userId,
        timestamp: new Date().toISOString()
      })
    } catch (_error) {
      console.error('Failed to log AI interaction:', _error)
    }
  }

  protected async callOpenAI(messages: Array<{ role: string; content: string }>, tools?: Array<Record<string, unknown>>, model: string = 'gpt-4') {
    try {
      if (!openai) {
        // Return mock response for development
        return {
          message: {
            content: `Mock AI response for ${this.agent}: Based on your request, here's a simulated intelligent response with insights and recommendations.`,
            role: 'assistant'
          },
          finish_reason: 'stop'
        }
      }

      const response = await openai.chat.completions.create({
        model,
        messages,
        tools,
        temperature: 0.3,
      })

      return response.choices[0]
    } catch (_error) {
      console.error(`AI Agent ${this.agent} error:`, _error)
      // Return fallback response instead of throwing
      return {
        message: {
          content: `I apologize, but I'm having trouble connecting right now. Please try again in a moment or contact your system administrator if the problem persists.`,
          role: 'assistant'
        },
        finish_reason: 'error'
      }
    }
  }

  protected getSystemPrompt(): string {
    return AGENTS[this.agent].systemPrompt
  }
}

// Ashley - Main Supervisor Agent
export class AshleyAgent extends AIAgentBase {
  constructor(userId?: string) {
    super('ashley', userId)
  }

  async generateWeeklyReport(dateRange: { start: Date; end: Date }) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      { 
        role: 'user', 
        content: `Generate a comprehensive weekly business report for ${dateRange.start.toDateString()} to ${dateRange.end.toDateString()}. Include executive summary, production metrics, financial health, inventory status, and top 3 recommended actions.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'generateWeeklyReport', dateRange },
      response,
      0.9
    )

    return response
  }

  async analyzeBusinessHealth() {
    // Fetch recent data for analysis
    const recentOrders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        tasks: true,
        brand: true
      },
      take: 10 // Limit results
    })

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      { 
        role: 'user', 
        content: `Analyze the current business health based on this recent data: ${JSON.stringify(recentOrders, null, 2)}. Provide insights on production flow, potential bottlenecks, and recommended actions.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeBusinessHealth', dataPoints: recentOrders.length },
      response,
      0.85
    )

    return response
  }
}

// Kai - Industrial Engineer Agent
export class KaiAgent extends AIAgentBase {
  constructor(userId?: string) {
    super('kai', userId)
  }

  async analyzeDeadlineRisk(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tasks: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          }
        }
      }
    })

    if (!order) throw new Error('Order not found')

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze deadline risk for order: ${JSON.stringify(order, null, 2)}. Consider current task progress, estimated completion times, and deadline. Recommend actions if risk is high.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeDeadlineRisk', orderId },
      response,
      0.8
    )

    return response
  }

  async optimizeTaskAssignment(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        order: true,
        assignee: true
      }
    })

    // Get available users for this task type
    const availableUsers = await prisma.user.findMany({
      where: {
        active: true
      },
      take: 5 // Limit results
    })

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Optimize assignment for task: ${JSON.stringify(task, null, 2)}. Available users: ${JSON.stringify(availableUsers, null, 2)}. Consider workload, skills, and efficiency.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'optimizeTaskAssignment', taskId },
      response,
      0.75
    )

    return response
  }

  async analyzeBottlenecks(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze current production bottlenecks. Consider pending tasks, user workloads, and capacity constraints. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeBottlenecks', data },
      response,
      0.8
    )

    return response
  }

  async optimizeCapacity(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Optimize production capacity and resource allocation. Consider current workloads, skills, and priorities. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'optimizeCapacity', data },
      response,
      0.8
    )

    return response
  }
}

// Mira - Finance Analyst Agent
export class MiraAgent extends AIAgentBase {
  constructor(userId?: string) {
    super('mira', userId)
  }

  async analyzeProfitability(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderCosts: true,
        tasks: {
          include: {
            taskCosts: true
          }
        }
      }
    })

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze profitability for order: ${JSON.stringify(order, null, 2)}. Calculate margins, identify cost drivers, and recommend pricing optimizations.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeProfitability', orderId },
      response,
      0.85
    )

    return response
  }

  async forecastCashFlow(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Forecast cash flow based on current orders, invoices, and payment schedules. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'forecastCashFlow', data },
      response,
      0.85
    )

    return response
  }

  async optimizePricing(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze pricing strategy and recommend optimizations. Consider costs, margins, and market positioning. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'optimizePricing', data },
      response,
      0.85
    )

    return response
  }

  async analyzeCosts(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze cost structure and identify optimization opportunities. Consider material, labor, and overhead costs. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeCosts', data },
      response,
      0.85
    )

    return response
  }

  async budgetAnalysis(data?: Record<string, unknown>) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Perform budget analysis and variance reporting. Compare actual vs. planned expenses. Data: ${JSON.stringify(data, null, 2)}`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'budgetAnalysis', data },
      response,
      0.85
    )

    return response
  }
}

// Nova - Warehouse Planner Agent
export class NovaAgent extends AIAgentBase {
  constructor(userId?: string) {
    super('nova', userId)
  }

  async analyzeInventoryHealth() {
    const inventory = await prisma.inventoryItem.findMany({
      where: { quantity: { lte: 10 } }, // Items with low stock
      include: {
        stockMovements: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      },
      take: 10
    })

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      {
        role: 'user',
        content: `Analyze inventory health: ${JSON.stringify(inventory, null, 2)}. Identify aging stock, reorder needs, and optimization opportunities.`
      }
    ]

    const response = await this.callOpenAI(messages)
    
    await this.logInteraction(
      { action: 'analyzeInventoryHealth', itemCount: inventory.length },
      response,
      0.8
    )

    return response
  }
}

// Factory function to create AI agents
export function createAgent(agent: AIAgent, userId?: string) {
  switch (agent) {
    case 'ashley':
      return new AshleyAgent(userId)
    case 'kai':
      return new KaiAgent(userId)
    case 'mira':
      return new MiraAgent(userId)
    case 'nova':
      return new NovaAgent(userId)
    default:
      throw new Error(`Agent ${agent} not implemented yet`)
  }
}

// Utility function to call any agent
export async function callAIAgent(
  agent: AIAgent,
  action: string,
  data: Record<string, unknown>,
  userId?: string
) {
  const agentInstance = createAgent(agent, userId)
  
  // Route to appropriate method based on action
  switch (action) {
    case 'generateWeeklyReport':
      if (agent === 'ashley') {
        return await (agentInstance as AshleyAgent).generateWeeklyReport(data as { start: Date; end: Date })
      }
      break
    case 'analyzeBusinessHealth':
      if (agent === 'ashley') {
        return await (agentInstance as AshleyAgent).analyzeBusinessHealth()
      }
      break
    case 'analyzeDeadlineRisk':
      if (agent === 'kai') {
        return await (agentInstance as KaiAgent).analyzeDeadlineRisk(data.orderId as string)
      }
      break
    case 'analyzeProfitability':
      if (agent === 'mira') {
        return await (agentInstance as MiraAgent).analyzeProfitability(data.orderId as string)
      }
      break
    case 'analyzeInventoryHealth':
      if (agent === 'nova') {
        return await (agentInstance as NovaAgent).analyzeInventoryHealth()
      }
      break
    default:
      throw new Error(`Action ${action} not supported for agent ${agent}`)
  }
}