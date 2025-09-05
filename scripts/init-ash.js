/**
 * ASH AI System Initialization Script
 * Run this to initialize the system with sample data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing ASH AI System...')
  
  try {
    // Clear existing data
    console.log('🧹 Cleaning existing data...')
    await prisma.routeTemplate.deleteMany()
    await prisma.client.deleteMany()
    await prisma.brand.deleteMany()
    
    console.log('✅ Data cleared')
    
    // Initialize brands
    console.log('📊 Creating brands...')
    await prisma.brand.createMany({
      data: [
        {
          id: 'brand-sorbetes-001',
          workspace_id: 'default',
          name: 'Sorbetes Apparel',
          code: 'SORB',
          settings: {
            default_margin: 0.4,
            auto_po_prefix: true,
            quality_standards: 'premium'
          }
        },
        {
          id: 'brand-reefer-001',
          workspace_id: 'default',
          name: 'Reefer Brand',
          code: 'REEF',
          settings: {
            default_margin: 0.35,
            auto_po_prefix: true,
            quality_standards: 'standard'
          }
        }
      ]
    })
    console.log('✅ Brands created')
    
    // Initialize clients
    console.log('👥 Creating clients...')
    await prisma.client.createMany({
      data: [
        {
          id: 'client-clark-safari-001',
          workspace_id: 'default',
          name: 'Clark Safari Adventures',
          company: 'Clark Safari & Adventure Park',
          emails: JSON.stringify(['ops@clarksafari.ph', 'procurement@clarksafari.ph']),
          phones: JSON.stringify(['+63-45-599-5555', '+63-917-123-4567']),
          billing_address: JSON.stringify({
            street: 'Clark Freeport Zone',
            city: 'Angeles City',
            province: 'Pampanga',
            postal_code: '2009',
            country: 'Philippines'
          }),
          notes: 'Premium safari park client. Requires high-quality outdoor apparel.',
          portal_access: true,
          risk_score: 0.15,
          ltv_prediction: 450000.0
        },
        {
          id: 'client-techhub-001',
          workspace_id: 'default',
          name: 'TechHub Philippines',
          company: 'TechHub Coworking Spaces',
          emails: JSON.stringify(['admin@techhub.ph', 'events@techhub.ph']),
          phones: JSON.stringify(['+63-2-8123-4567']),
          billing_address: JSON.stringify({
            street: 'BGC Central Plaza',
            city: 'Taguig City',
            province: 'Metro Manila',
            postal_code: '1634',
            country: 'Philippines'
          }),
          notes: 'Tech startup incubator. Orders corporate shirts and hoodies for events.',
          portal_access: true,
          risk_score: 0.25,
          ltv_prediction: 180000.0
        }
      ]
    })
    console.log('✅ Clients created')
    
    // Initialize routing templates
    console.log('🛣️ Creating routing templates...')
    await prisma.routeTemplate.createMany({
      data: [
        {
          id: 'template-silk-a-001',
          template_key: 'SILK_OPTION_A',
          name: 'Silkscreen Standard Route',
          method: 'SILKSCREEN',
          steps: JSON.stringify([
            {
              name: 'Design & Separation',
              workcenter: 'DESIGN',
              sequence: 1,
              standard_spec: { review_time_hours: 2, approval_required: true }
            },
            {
              name: 'Fabric Cutting',
              workcenter: 'CUTTING',
              sequence: 2,
              standard_spec: { pieces_per_hour: 120, waste_tolerance: 0.05 }
            },
            {
              name: 'Screen Printing',
              workcenter: 'PRINTING',
              sequence: 3,
              standard_spec: { pieces_per_hour: 150, cure_temp: 320, cure_time: 45 }
            },
            {
              name: 'Sewing Assembly',
              workcenter: 'SEWING',
              sequence: 4,
              standard_spec: { pieces_per_hour: 25, stitch_quality: 'standard' }
            },
            {
              name: 'Quality Control',
              workcenter: 'QC',
              sequence: 5,
              standard_spec: { sample_rate: 0.1, defect_tolerance: 0.02 }
            },
            {
              name: 'Packaging',
              workcenter: 'PACKING',
              sequence: 6,
              standard_spec: { pieces_per_hour: 200, packaging_type: 'polybag' }
            }
          ]),
          success_rate: 0.95,
          avg_lead_time: 7200
        },
        {
          id: 'template-silk-b-001',
          template_key: 'SILK_OPTION_B',
          name: 'Silkscreen Alternative Route (Ashley Guarded)',
          method: 'SILKSCREEN',
          steps: JSON.stringify([
            {
              name: 'Design & Separation',
              workcenter: 'DESIGN',
              sequence: 1,
              standard_spec: { review_time_hours: 2, approval_required: true }
            },
            {
              name: 'Fabric Cutting',
              workcenter: 'CUTTING',
              sequence: 2,
              standard_spec: { pieces_per_hour: 120, waste_tolerance: 0.05 }
            },
            {
              name: 'Sewing Assembly',
              workcenter: 'SEWING',
              sequence: 3,
              standard_spec: { pieces_per_hour: 25, stitch_quality: 'standard' }
            },
            {
              name: 'Screen Printing',
              workcenter: 'PRINTING',
              sequence: 4,
              standard_spec: { pieces_per_hour: 100, cure_temp: 320, cure_time: 45 }
            },
            {
              name: 'Quality Control',
              workcenter: 'QC',
              sequence: 5,
              standard_spec: { sample_rate: 0.15, defect_tolerance: 0.03 }
            },
            {
              name: 'Packaging',
              workcenter: 'PACKING',
              sequence: 6,
              standard_spec: { pieces_per_hour: 200, packaging_type: 'polybag' }
            }
          ]),
          success_rate: 0.80,
          avg_lead_time: 8640
        },
        {
          id: 'template-dtf-001',
          template_key: 'DTF_DEFAULT',
          name: 'DTF Standard Route',
          method: 'DTF',
          steps: JSON.stringify([
            {
              name: 'Design Preparation',
              workcenter: 'DESIGN',
              sequence: 1,
              standard_spec: { review_time_hours: 1.5, color_optimization: true }
            },
            {
              name: 'DTF Printing & Powder',
              workcenter: 'PRINTING',
              sequence: 2,
              standard_spec: { pieces_per_hour: 200, powder_cure_temp: 160 }
            },
            {
              name: 'DTF Heat Application',
              workcenter: 'HEAT_PRESS',
              sequence: 3,
              standard_spec: { temp_celsius: 160, pressure_seconds: 15, pieces_per_hour: 150 }
            },
            {
              name: 'Quality Control',
              workcenter: 'QC',
              sequence: 4,
              standard_spec: { sample_rate: 0.08, adhesion_test: true }
            },
            {
              name: 'Packaging',
              workcenter: 'PACKING',
              sequence: 5,
              standard_spec: { pieces_per_hour: 220, packaging_type: 'standard_bag' }
            }
          ]),
          success_rate: 0.97,
          avg_lead_time: 4320
        }
      ]
    })
    console.log('✅ Routing templates created')
    
    // Create PO number sequences
    console.log('🔢 Creating PO number sequences...')
    await prisma.pONumberSequence.createMany({
      data: [
        {
          id: 'seq-sorb-2025',
          brand_id: 'brand-sorbetes-001',
          year: 2025,
          sequence: 0
        },
        {
          id: 'seq-reef-2025',
          brand_id: 'brand-reefer-001',
          year: 2025,
          sequence: 0
        }
      ]
    })
    console.log('✅ PO number sequences created')
    
    console.log('🎉 ASH AI System initialization completed successfully!')
    
    // Display summary
    const [brandCount, clientCount, templateCount] = await Promise.all([
      prisma.brand.count(),
      prisma.client.count(),
      prisma.routeTemplate.count()
    ])
    
    console.log('\n📊 System Summary:')
    console.log(`   Brands: ${brandCount}`)
    console.log(`   Clients: ${clientCount}`)
    console.log(`   Routing Templates: ${templateCount}`)
    console.log('\n✅ System is ready for production!')
    
  } catch (error) {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()