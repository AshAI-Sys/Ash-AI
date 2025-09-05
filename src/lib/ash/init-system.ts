/**
 * ASH AI System Initialization
 * Professional data seeding and system setup for futuristic ERP
 */

import { PrismaClient, ProcessType, RouteTemplateType, WorkcenterType } from '@prisma/client'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

export async function initializeAshSystem(workspace_id: string = 'default') {
  console.log('🚀 Initializing ASH AI System...')
  
  try {
    // 1. Create default brands
    await createDefaultBrands(workspace_id)
    
    // 2. Create sample clients
    await createSampleClients(workspace_id)
    
    // 3. Create routing templates
    await createRoutingTemplates()
    
    // 4. Create sample users
    await createSampleUsers()
    
    console.log('✅ ASH AI System initialized successfully!')
    
    return {
      success: true,
      message: 'ASH AI System initialized with sample data'
    }
  } catch (error) {
    console.error('❌ Failed to initialize ASH AI System:', error)
    throw error
  }
}

async function createDefaultBrands(workspace_id: string) {
  console.log('📊 Creating default brands...')
  
  const brands = [
    {
      id: nanoid(),
      workspace_id,
      name: 'Sorbetes Apparel',
      code: 'SORB',
      settings: {
        default_margin: 0.4,
        auto_po_prefix: true,
        quality_standards: 'premium'
      },
      ai_insights: {},
      default_route_templates: {
        SILKSCREEN: 'SILK_OPTION_A',
        SUBLIMATION: 'SUBL_DEFAULT',
        DTF: 'DTF_DEFAULT',
        EMBROIDERY: 'EMB_DEFAULT'
      },
      margin_thresholds: {
        Tee: 0.25,
        Hoodie: 0.30,
        Jersey: 0.35,
        Uniform: 0.40
      },
      capacity_limits: {
        daily_orders: 50,
        weekly_quantity: 5000
      }
    },
    {
      id: nanoid(),
      workspace_id,
      name: 'Reefer Brand',
      code: 'REEF',
      settings: {
        default_margin: 0.35,
        auto_po_prefix: true,
        quality_standards: 'standard'
      },
      ai_insights: {},
      default_route_templates: {
        SILKSCREEN: 'SILK_OPTION_A',
        SUBLIMATION: 'SUBL_DEFAULT',
        DTF: 'DTF_DEFAULT',
        EMBROIDERY: 'EMB_DEFAULT'
      },
      margin_thresholds: {
        Tee: 0.20,
        Hoodie: 0.25,
        Jersey: 0.30,
        Uniform: 0.35
      },
      capacity_limits: {
        daily_orders: 75,
        weekly_quantity: 8000
      }
    }
  ]

  for (const brandData of brands) {
    await prisma.brand.upsert({
      where: { code: brandData.code },
      update: brandData,
      create: brandData
    })
  }
  
  console.log(`✅ Created ${brands.length} default brands`)
}

async function createSampleClients(workspace_id: string) {
  console.log('👥 Creating sample clients...')
  
  const clients = [
    {
      id: nanoid(),
      workspace_id,
      name: 'Clark Safari Adventures',
      company: 'Clark Safari & Adventure Park',
      emails: ['ops@clarksafari.ph', 'procurement@clarksafari.ph'],
      phones: ['+63-45-599-5555', '+63-917-123-4567'],
      billing_address: {
        street: 'Clark Freeport Zone',
        city: 'Angeles City',
        province: 'Pampanga',
        postal_code: '2009',
        country: 'Philippines'
      },
      notes: 'Premium safari park client. Requires high-quality outdoor apparel.',
      portal_access: true,
      ai_preferences: {
        preferred_communication: 'email',
        order_frequency: 'monthly',
        quality_preference: 'premium'
      },
      risk_score: 0.15,
      ltv_prediction: 450000.0
    },
    {
      id: nanoid(),
      workspace_id,
      name: 'TechHub Philippines',
      company: 'TechHub Coworking Spaces',
      emails: ['admin@techhub.ph', 'events@techhub.ph'],
      phones: ['+63-2-8123-4567'],
      billing_address: {
        street: 'BGC Central Plaza',
        city: 'Taguig City',
        province: 'Metro Manila',
        postal_code: '1634',
        country: 'Philippines'
      },
      notes: 'Tech startup incubator. Orders corporate shirts and hoodies for events.',
      portal_access: true,
      ai_preferences: {
        preferred_communication: 'slack',
        order_frequency: 'quarterly',
        quality_preference: 'standard'
      },
      risk_score: 0.25,
      ltv_prediction: 180000.0
    },
    {
      id: nanoid(),
      workspace_id,
      name: 'Barangay San Antonio',
      company: 'Local Government Unit',
      emails: ['captain@sanantoniolgu.gov.ph'],
      phones: ['+63-2-8987-6543'],
      billing_address: {
        street: 'Barangay Hall, San Antonio',
        city: 'Quezon City',
        province: 'Metro Manila',
        postal_code: '1105',
        country: 'Philippines'
      },
      notes: 'Local government client. Orders uniforms and event shirts.',
      portal_access: false,
      ai_preferences: {
        preferred_communication: 'phone',
        order_frequency: 'bi-annual',
        quality_preference: 'standard'
      },
      risk_score: 0.05,
      ltv_prediction: 120000.0
    }
  ]

  for (const clientData of clients) {
    await prisma.client.upsert({
      where: { id: clientData.id },
      update: clientData,
      create: clientData
    })
  }
  
  console.log(`✅ Created ${clients.length} sample clients`)
}

async function createRoutingTemplates() {
  console.log('🛣️  Creating routing templates...')
  
  const templates = [
    {
      id: nanoid(),
      template_key: RouteTemplateType.SILK_OPTION_A,
      name: 'Silkscreen Standard Route',
      method: ProcessType.SILKSCREEN,
      steps: [
        {
          name: 'Design & Separation',
          workcenter: WorkcenterType.DESIGN,
          sequence: 1,
          standard_spec: { review_time_hours: 2, approval_required: true },
          expected_outputs: { design_files: 1, color_separations: 1 }
        },
        {
          name: 'Fabric Cutting',
          workcenter: WorkcenterType.CUTTING,
          sequence: 2,
          standard_spec: { pieces_per_hour: 120, waste_tolerance: 0.05 },
          expected_outputs: { cut_pieces: 'size_curve_total' }
        },
        {
          name: 'Screen Printing',
          workcenter: WorkcenterType.PRINTING,
          sequence: 3,
          standard_spec: { pieces_per_hour: 150, cure_temp: 320, cure_time: 45 },
          expected_outputs: { printed_pieces: 'size_curve_total' }
        },
        {
          name: 'Sewing Assembly',
          workcenter: WorkcenterType.SEWING,
          sequence: 4,
          standard_spec: { pieces_per_hour: 25, stitch_quality: 'standard' },
          expected_outputs: { finished_garments: 'size_curve_total' }
        },
        {
          name: 'Quality Control',
          workcenter: WorkcenterType.QC,
          sequence: 5,
          standard_spec: { sample_rate: 0.1, defect_tolerance: 0.02 },
          expected_outputs: { passed_pieces: 'size_curve_total', qc_report: 1 }
        },
        {
          name: 'Packaging',
          workcenter: WorkcenterType.PACKING,
          sequence: 6,
          standard_spec: { pieces_per_hour: 200, packaging_type: 'polybag' },
          expected_outputs: { packed_orders: 1 }
        }
      ],
      ai_optimization: {
        success_rate: 0.95,
        avg_lead_time_days: 5,
        bottleneck_workcenter: 'SEWING',
        efficiency_score: 0.88
      },
      success_rate: 0.95,
      avg_lead_time: 7200, // 5 days in minutes
      risk_factors: ['high_quantity_complexity', 'color_registration_risk']
    },
    {
      id: nanoid(),
      template_key: RouteTemplateType.SILK_OPTION_B,
      name: 'Silkscreen Alternative Route (Ashley Guarded)',
      method: ProcessType.SILKSCREEN,
      steps: [
        {
          name: 'Design & Separation',
          workcenter: WorkcenterType.DESIGN,
          sequence: 1,
          standard_spec: { review_time_hours: 2, approval_required: true },
          expected_outputs: { design_files: 1, color_separations: 1 }
        },
        {
          name: 'Fabric Cutting',
          workcenter: WorkcenterType.CUTTING,
          sequence: 2,
          standard_spec: { pieces_per_hour: 120, waste_tolerance: 0.05 },
          expected_outputs: { cut_pieces: 'size_curve_total' }
        },
        {
          name: 'Sewing Assembly',
          workcenter: WorkcenterType.SEWING,
          sequence: 3,
          standard_spec: { pieces_per_hour: 25, stitch_quality: 'standard' },
          expected_outputs: { sewn_garments: 'size_curve_total' }
        },
        {
          name: 'Screen Printing',
          workcenter: WorkcenterType.PRINTING,
          sequence: 4,
          standard_spec: { pieces_per_hour: 100, cure_temp: 320, cure_time: 45 },
          expected_outputs: { printed_garments: 'size_curve_total' },
          notes: 'RISK: Printing on finished garments increases reject rate'
        },
        {
          name: 'Quality Control',
          workcenter: WorkcenterType.QC,
          sequence: 5,
          standard_spec: { sample_rate: 0.15, defect_tolerance: 0.03 },
          expected_outputs: { passed_pieces: 'size_curve_total', qc_report: 1 }
        },
        {
          name: 'Packaging',
          workcenter: WorkcenterType.PACKING,
          sequence: 6,
          standard_spec: { pieces_per_hour: 200, packaging_type: 'polybag' },
          expected_outputs: { packed_orders: 1 }
        }
      ],
      ai_optimization: {
        success_rate: 0.80,
        avg_lead_time_days: 6,
        bottleneck_workcenter: 'PRINTING',
        efficiency_score: 0.72,
        warning: 'Higher reject rate due to print-on-finished risk'
      },
      success_rate: 0.80,
      avg_lead_time: 8640, // 6 days in minutes
      risk_factors: ['print_on_finished_risk', 'higher_reject_rate', 'difficult_repairs']
    },
    {
      id: nanoid(),
      template_key: RouteTemplateType.SUBLIMATION_DEFAULT,
      name: 'Sublimation Standard Route',
      method: ProcessType.SUBLIMATION,
      steps: [
        {
          name: 'Design & GA Preparation',
          workcenter: WorkcenterType.DESIGN,
          sequence: 1,
          standard_spec: { review_time_hours: 3, color_matching_required: true },
          expected_outputs: { ga_files: 1, print_layout: 1 }
        },
        {
          name: 'Sublimation Printing',
          workcenter: WorkcenterType.PRINTING,
          sequence: 2,
          standard_spec: { sheets_per_hour: 50, print_quality: 'high_res' },
          expected_outputs: { printed_sheets: 'calculated_sheets' }
        },
        {
          name: 'Heat Press Transfer',
          workcenter: WorkcenterType.HEAT_PRESS,
          sequence: 3,
          standard_spec: { temp_celsius: 200, pressure_seconds: 60, pieces_per_hour: 80 },
          expected_outputs: { pressed_pieces: 'size_curve_total' }
        },
        {
          name: 'Fabric Cutting',
          workcenter: WorkcenterType.CUTTING,
          sequence: 4,
          standard_spec: { pieces_per_hour: 100, waste_tolerance: 0.03 },
          expected_outputs: { cut_pieces: 'size_curve_total' }
        },
        {
          name: 'Sewing Assembly',
          workcenter: WorkcenterType.SEWING,
          sequence: 5,
          standard_spec: { pieces_per_hour: 30, stitch_quality: 'premium' },
          expected_outputs: { finished_garments: 'size_curve_total' }
        },
        {
          name: 'Quality Control',
          workcenter: WorkcenterType.QC,
          sequence: 6,
          standard_spec: { sample_rate: 0.1, color_match_check: true },
          expected_outputs: { passed_pieces: 'size_curve_total', qc_report: 1 }
        },
        {
          name: 'Packaging',
          workcenter: WorkcenterType.PACKING,
          sequence: 7,
          standard_spec: { pieces_per_hour: 180, packaging_type: 'premium_bag' },
          expected_outputs: { packed_orders: 1 }
        }
      ],
      ai_optimization: {
        success_rate: 0.92,
        avg_lead_time_days: 7,
        bottleneck_workcenter: 'HEAT_PRESS',
        efficiency_score: 0.85
      },
      success_rate: 0.92,
      avg_lead_time: 10080, // 7 days in minutes
      risk_factors: ['color_matching_complexity', 'heat_press_capacity']
    },
    {
      id: nanoid(),
      template_key: RouteTemplateType.DTF_DEFAULT,
      name: 'DTF Standard Route',
      method: ProcessType.DTF,
      steps: [
        {
          name: 'Design Preparation',
          workcenter: WorkcenterType.DESIGN,
          sequence: 1,
          standard_spec: { review_time_hours: 1.5, color_optimization: true },
          expected_outputs: { dtf_ready_files: 1 }
        },
        {
          name: 'DTF Printing & Powder',
          workcenter: WorkcenterType.PRINTING,
          sequence: 2,
          standard_spec: { pieces_per_hour: 200, powder_cure_temp: 160 },
          expected_outputs: { dtf_transfers: 'size_curve_total' }
        },
        {
          name: 'DTF Heat Application',
          workcenter: WorkcenterType.HEAT_PRESS,
          sequence: 3,
          standard_spec: { temp_celsius: 160, pressure_seconds: 15, pieces_per_hour: 150 },
          expected_outputs: { finished_garments: 'size_curve_total' }
        },
        {
          name: 'Quality Control',
          workcenter: WorkcenterType.QC,
          sequence: 4,
          standard_spec: { sample_rate: 0.08, adhesion_test: true },
          expected_outputs: { passed_pieces: 'size_curve_total', qc_report: 1 }
        },
        {
          name: 'Packaging',
          workcenter: WorkcenterType.PACKING,
          sequence: 5,
          standard_spec: { pieces_per_hour: 220, packaging_type: 'standard_bag' },
          expected_outputs: { packed_orders: 1 }
        }
      ],
      ai_optimization: {
        success_rate: 0.97,
        avg_lead_time_days: 3,
        bottleneck_workcenter: 'HEAT_PRESS',
        efficiency_score: 0.91
      },
      success_rate: 0.97,
      avg_lead_time: 4320, // 3 days in minutes
      risk_factors: ['transfer_adhesion_risk']
    },
    {
      id: nanoid(),
      template_key: RouteTemplateType.EMBROIDERY_DEFAULT,
      name: 'Embroidery Standard Route',
      method: ProcessType.EMBROIDERY,
      steps: [
        {
          name: 'Design Digitization',
          workcenter: WorkcenterType.DESIGN,
          sequence: 1,
          standard_spec: { digitize_time_hours: 4, stitch_optimization: true },
          expected_outputs: { embroidery_files: 1, stitch_count: 'calculated' }
        },
        {
          name: 'Fabric Cutting',
          workcenter: WorkcenterType.CUTTING,
          sequence: 2,
          standard_spec: { pieces_per_hour: 120, precision_required: true },
          expected_outputs: { cut_pieces: 'size_curve_total' }
        },
        {
          name: 'Embroidery Production',
          workcenter: WorkcenterType.EMBROIDERY,
          sequence: 3,
          standard_spec: { pieces_per_hour: 45, thread_quality: 'premium', hoop_changes: 'minimal' },
          expected_outputs: { embroidered_pieces: 'size_curve_total' }
        },
        {
          name: 'Sewing Assembly',
          workcenter: WorkcenterType.SEWING,
          sequence: 4,
          standard_spec: { pieces_per_hour: 28, finish_quality: 'premium' },
          expected_outputs: { finished_garments: 'size_curve_total' }
        },
        {
          name: 'Quality Control',
          workcenter: WorkcenterType.QC,
          sequence: 5,
          standard_spec: { sample_rate: 0.12, thread_tension_check: true },
          expected_outputs: { passed_pieces: 'size_curve_total', qc_report: 1 }
        },
        {
          name: 'Packaging',
          workcenter: WorkcenterType.PACKING,
          sequence: 6,
          standard_spec: { pieces_per_hour: 160, packaging_type: 'premium_box' },
          expected_outputs: { packed_orders: 1 }
        }
      ],
      ai_optimization: {
        success_rate: 0.89,
        avg_lead_time_days: 8,
        bottleneck_workcenter: 'EMBROIDERY',
        efficiency_score: 0.78
      },
      success_rate: 0.89,
      avg_lead_time: 11520, // 8 days in minutes
      risk_factors: ['thread_break_risk', 'design_complexity', 'machine_downtime']
    }
  ]

  for (const templateData of templates) {
    await prisma.routeTemplate.upsert({
      where: { id: templateData.id },
      update: templateData,
      create: templateData
    })
  }
  
  console.log(`✅ Created ${templates.length} routing templates`)
}

async function createSampleUsers() {
  console.log('👤 Creating sample users (skipped - handled by auth system)')
  // User creation is typically handled by the authentication system
  // This is just a placeholder for future user seeding if needed
}

// Export the initialization function for use in API or scripts
export { initializeAshSystem as default }