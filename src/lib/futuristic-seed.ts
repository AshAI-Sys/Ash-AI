import { PrismaClient, Role, RouteTemplateType, ProcessType, WorkcenterType, WalletType, AlertSeverity, AlertCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function seedFuturisticDatabase() {
  console.log('🚀 ASH AI: Initializing Futuristic ERP Database...')
  console.log('🤖 Loading Neural Network Components...')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const workspaceId = 'ash_ai_main_workspace'

  // 🧠 Create AI-Enhanced User Accounts
  console.log('🧠 Creating AI-Enhanced User Accounts...')
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ash-ai.com' },
    update: {},
    create: {
      email: 'admin@ash-ai.com',
      full_name: 'ASH AI System Administrator',
      password: hashedPassword,
      role: Role.ADMIN,
      ai_skill_score: 0.95,
      permissions: {
        all_access: true,
        ai_management: true,
        system_config: true,
        user_management: true,
        financial_access: true
      },
      preferences: {
        theme: 'futuristic',
        dashboard_ai_assistance_level: 'maximum'
      },
    },
  })

  const ashley_ai = await prisma.user.upsert({
    where: { email: 'ashley@ash-ai.com' },
    update: {},
    create: {
      email: 'ashley@ash-ai.com',
      full_name: 'Ashley - AI Production Assistant',
      password: hashedPassword,
      role: Role.ADMIN,
      ai_skill_score: 1.0,
      permissions: {
        ai_agent: true,
        predictive_analytics: true,
        optimization_engine: true,
        neural_insights: true
      },
      preferences: {
        theme: 'holographic',
        response_style: 'professional_futuristic',
        learning_mode: 'continuous'
      },
    },
  })

  // 🏢 Create Futuristic Brands
  console.log('🏢 Creating Quantum-Enhanced Brands...')
  
  const sorbetes = await prisma.brand.upsert({
    where: { name: 'Sorbetes Futuristic' },
    update: {},
    create: {
      workspace_id: workspaceId,
      name: 'Sorbetes Futuristic',
      code: 'SORB-2024',
      settings: {
        primary_colors: ['#00f5ff', '#ff1493', '#7b68ee'],
        production_capacity: {
          silkscreen: 1500,
          sublimation: 800,
          dtf: 1200,
          embroidery: 600
        },
        quality_standards: {
          reject_threshold: 0.02,
          ai_inspection: true,
          neural_pattern_matching: true
        }
      },
      ai_insights: {
        performance_score: 0.92,
        efficiency_trends: ['improving', 'stable', 'excellent'],
        predicted_demand: {
          next_30_days: 2500,
          seasonal_multiplier: 1.3
        }
      },
      default_route_templates: {
        silkscreen: 'SILK_OPTION_A',
        sublimation: 'SUBLIMATION_DEFAULT',
        dtf: 'DTF_DEFAULT',
        embroidery: 'EMBROIDERY_DEFAULT'
      }
    }
  })

  const reefer = await prisma.brand.upsert({
    where: { name: 'Reefer Neural' },
    update: {},
    create: {
      workspace_id: workspaceId,
      name: 'Reefer Neural',
      code: 'REEF-2024',
      settings: {
        primary_colors: ['#32cd32', '#00fa9a', '#98fb98'],
        production_capacity: {
          silkscreen: 2000,
          sublimation: 1000,
          dtf: 1500,
          embroidery: 800
        },
        quality_standards: {
          reject_threshold: 0.015,
          ai_inspection: true,
          holographic_quality_check: true
        }
      },
      ai_insights: {
        performance_score: 0.89,
        efficiency_trends: ['stable', 'improving', 'good'],
        market_position: 'premium_sustainable'
      }
    }
  })

  // 🛣️ Create AI-Powered Route Templates
  console.log('🛣️ Initializing Neural Route Templates...')
  
  const existingTemplate = await prisma.routeTemplate.findFirst({
    where: { template_key: RouteTemplateType.SILK_OPTION_A }
  })
  
  if (!existingTemplate) {
    await prisma.routeTemplate.create({
      data: {
        brand_id: sorbetes.id,
        template_key: RouteTemplateType.SILK_OPTION_A,
        name: 'Quantum Silkscreen Route A',
        method: ProcessType.SILKSCREEN,
        steps: [
          { name: 'Neural Design Analysis', workcenter: 'DESIGN', duration: 30, ai_optimized: true },
          { name: 'Quantum Cutting', workcenter: 'CUTTING', duration: 45, parallel: true },
          { name: 'AI-Enhanced Printing', workcenter: 'PRINTING', duration: 60, critical: true },
          { name: 'Smart Sewing', workcenter: 'SEWING', duration: 90, ai_assistance: true },
          { name: 'Holographic QC', workcenter: 'QC', duration: 20, ai_vision: true },
          { name: 'Neural Packing', workcenter: 'PACKING', duration: 15, automation: true }
        ],
        ai_optimization: {
          efficiency_score: 0.94,
          bottleneck_prediction: 'sewing',
          optimization_suggestions: ['parallel_cutting_printing', 'ai_sewing_assistance']
        },
        success_rate: 0.97,
        avg_lead_time: 260
      }
    })
  }

  // 👥 Create Futuristic Clients
  console.log('👥 Creating AI-Enhanced Client Profiles...')
  
  const existingClient = await prisma.client.findFirst({
    where: { name: 'Quantum Fashion Co.' }
  })
  
  const client1 = existingClient || await prisma.client.create({
    data: {
      workspace_id: workspaceId,
      name: 'Quantum Fashion Co.',
      company: 'Quantum Fashion Corporation',
      emails: ['orders@quantumfashion.com', 'ceo@quantumfashion.com'],
      phones: ['+639171234567', '+639189876543'],
      billing_address: {
        street: '123 Futuristic Avenue',
        city: 'Makati',
        province: 'Metro Manila',
        postal_code: '1200',
        country: 'Philippines'
      },
      ai_preferences: {
        preferred_styles: ['minimalist', 'tech-wear', 'sustainable'],
        order_patterns: 'monthly_bulk',
        communication_style: 'professional'
      },
      risk_score: 0.15,
      ltv_prediction: 2500000.0
    }
  })

  // 💰 Create Neural Wallet System
  console.log('💰 Initializing Neural Financial System...')
  
  const existingWallet = await prisma.wallet.findFirst({
    where: { label: 'ASH AI Primary Bank Account' }
  })
  
  if (!existingWallet) {
    await prisma.wallet.createMany({
      data: [
        {
          type: WalletType.BANK,
          label: 'ASH AI Primary Bank Account',
          balance: 5000000.0
        },
        {
          type: WalletType.GCASH,
          label: 'Quantum GCash Business',
          balance: 150000.0
        },
        {
          type: WalletType.CASH_REGISTER,
          label: 'Neural Cash Register',
          balance: 25000.0
        }
      ]
    })
  }

  // 🎯 Create Smart Alerts
  console.log('🎯 Creating Intelligent Alert System...')
  
  await prisma.alert.create({
    data: {
      severity: AlertSeverity.P2,
      category: AlertCategory.PRODUCTION,
      title: 'Neural Production Optimization Available',
      summary: 'Ashley AI detected a 15% efficiency improvement opportunity',
      description: 'Machine learning analysis suggests optimizing the silkscreen workflow by implementing parallel processing in the cutting stage.',
      impact_analysis: {
        efficiency_gain: 0.15,
        cost_reduction: 25000,
        time_saved: '2.5 hours per batch'
      },
      recommendation: 'Implement parallel cutting-printing workflow for orders >200 pieces',
      automation_available: true,
      predicted_resolution_time: 60
    }
  })

  // 📊 Create AI Predictions
  console.log('📊 Generating AI Performance Predictions...')
  
  await prisma.productionForecast.create({
    data: {
      forecast_date: new Date(),
      forecast_horizon: 30,
      workcenter: WorkcenterType.PRINTING,
      predicted_capacity: 0.87,
      predicted_bottlenecks: {
        primary: 'heat_press_station',
        probability: 0.73,
        impact: 'medium'
      },
      demand_forecast: {
        silkscreen: 1200,
        sublimation: 800,
        dtf: 600,
        embroidery: 400
      },
      resource_requirements: {
        staff_needed: 15,
        machine_hours: 180,
        materials: ['ink', 'substrates', 'frames']
      },
      confidence_score: 0.91,
      model_version: 'ashley-v2024.1'
    }
  })

  // 🎨 Create Futuristic Dashboard Widgets
  console.log('🎨 Creating Holographic Dashboard Components...')
  
  await prisma.dashboardWidget.createMany({
    data: [
      {
        user_id: admin.id,
        widget_type: 'HOLOGRAM',
        title: 'Neural Production Flow',
        config: {
          visualization_type: '3d_flow',
          real_time: true,
          ai_enhanced: true
        },
        position: { x: 0, y: 0, w: 6, h: 4 },
        data_source: 'production_metrics',
        ai_enhanced: true,
        hologram_data: {
          model_type: 'flow_visualization',
          interactive: true,
          particles: true
        }
      },
      {
        user_id: admin.id,
        widget_type: 'AI_INSIGHT',
        title: 'Ashley AI Recommendations',
        config: {
          insight_type: 'optimization',
          priority: 'high',
          auto_refresh: true
        },
        position: { x: 6, y: 0, w: 6, h: 4 },
        data_source: 'ai_recommendations',
        ai_enhanced: true
      }
    ]
  })

  // 🧬 Create AI Recommendations
  console.log('🧬 Generating Neural Recommendations...')
  
  await prisma.aIRecommendation.create({
    data: {
      type: 'ROUTE_OPTIMIZATION',
      priority: 'HIGH',
      title: 'Quantum Route Optimization Detected',
      description: 'Neural network analysis suggests implementing a hybrid workflow for large orders',
      rationale: 'AI analysis of 1000+ orders shows 23% efficiency gain with parallel processing',
      expected_impact: {
        efficiency_improvement: 0.23,
        cost_reduction: 50000,
        delivery_time_reduction: '1.2 days average'
      },
      implementation: {
        steps: [
          'Update route template for orders >500 pieces',
          'Train staff on parallel workflow',
          'Monitor performance for 2 weeks',
          'Full deployment if successful'
        ],
        estimated_time: '5 days',
        resources_needed: ['staff_training', 'workflow_update']
      },
      confidence: 0.87,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  })

  console.log('🎉 ASH AI Database Initialized Successfully!')
  console.log('🚀 Neural Network Components: ONLINE')
  console.log('🤖 Ashley AI Assistant: ACTIVE')
  console.log('⚡ Quantum Optimization Engine: READY')
  console.log('🧠 Machine Learning Models: TRAINED')
  console.log('🔮 Predictive Analytics: ENABLED')
}

async function main() {
  try {
    await seedFuturisticDatabase()
  } catch (_error) {
    console.error('❌ Seeding failed:', _error)
    throw _error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export default main