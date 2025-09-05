import { prisma } from '../lib/db'
import { RoutingTemplateService } from '../lib/ash/routing-templates'

async function initializeAshSystem() {
  console.log('🚀 Initializing ASH AI System...')

  try {
    // 1. Create default workspace if it doesn't exist
    console.log('📁 Creating default workspace...')
    const workspace = await prisma.workspace.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        name: 'Sorbetes Apparel Studio',
        settings: {
          timezone: 'Asia/Manila',
          currency: 'PHP',
          workingHours: {
            start: '08:00',
            end: '17:00',
            daysPerWeek: 6
          }
        },
        active: true
      }
    })
    console.log(`✅ Workspace created: ${workspace.name}`)

    // 2. Initialize routing templates
    console.log('🛣️  Setting up routing templates...')
    await RoutingTemplateService.initializeTemplates()
    console.log('✅ Routing templates initialized')

    // 3. Create sample brands if none exist
    console.log('🏷️  Setting up sample brands...')
    const existingBrands = await prisma.brand.count()
    
    if (existingBrands === 0) {
      const brands = [
        {
          name: 'Reefer',
          code: 'REEF',
          active: true
        },
        {
          name: 'Sorbetes',
          code: 'SORB',
          active: true
        },
        {
          name: 'Test Brand',
          code: 'TEST',
          active: true
        }
      ]

      for (const brandData of brands) {
        await prisma.brand.create({
          data: {
            ...brandData,
            workspace_id: workspace.id
          }
        })
      }
      console.log(`✅ Created ${brands.length} sample brands`)
    } else {
      console.log(`✅ Found ${existingBrands} existing brands`)
    }

    // 4. Create sample inventory items
    console.log('📦 Setting up sample inventory...')
    const existingItems = await prisma.inventoryItem.count()
    
    if (existingItems === 0) {
      const items = [
        {
          name: 'Cotton Fabric - Black',
          sku: 'FAB-COT-BLK',
          category: 'Fabric',
          unit: 'kg',
          quantity: 100,
          unitCost: 250.0,
          reorderPoint: 20
        },
        {
          name: 'Cotton Fabric - White',
          sku: 'FAB-COT-WHT',
          category: 'Fabric',
          unit: 'kg',
          quantity: 150,
          unitCost: 240.0,
          reorderPoint: 25
        },
        {
          name: 'Plastisol Ink - Black',
          sku: 'INK-PLS-BLK',
          category: 'Ink',
          unit: 'kg',
          quantity: 10,
          unitCost: 800.0,
          reorderPoint: 2
        },
        {
          name: 'DTF Film',
          sku: 'DTF-FILM-60',
          category: 'DTF',
          unit: 'm',
          quantity: 500,
          unitCost: 45.0,
          reorderPoint: 100
        },
        {
          name: 'Transfer Paper',
          sku: 'SUB-PAPER-A4',
          category: 'Sublimation',
          unit: 'sheet',
          quantity: 1000,
          unitCost: 5.0,
          reorderPoint: 200
        }
      ]

      for (const itemData of items) {
        await prisma.inventoryItem.create({
          data: {
            ...itemData,
            workspace_id: workspace.id,
            unit_cost: itemData.unitCost || 0,
            min_stock: itemData.reorderPoint || 0
          }
        })
      }
      console.log(`✅ Created ${items.length} sample inventory items`)
    } else {
      console.log(`✅ Found ${existingItems} existing inventory items`)
    }

    // 5. Create sample machines
    console.log('🏭 Setting up sample machines...')
    const existingMachines = await prisma.machine.count()
    
    if (existingMachines === 0) {
      const machines = [
        {
          name: 'Manual Press #1',
          type: 'PRINTING',
          model: 'Manual Carousel',
          location: 'Production Floor A',
          active: true
        },
        {
          name: 'Heat Press #1',
          type: 'PRINTING',
          model: 'Flat Heat Press 15x15',
          location: 'Production Floor A',
          active: true
        },
        {
          name: 'Sublimation Printer',
          type: 'PRINTING',
          model: 'Epson SureColor F170',
          location: 'Design Station',
          active: true
        },
        {
          name: 'Embroidery Machine #1',
          type: 'EMBROIDERY',
          model: '12-Head Commercial',
          location: 'Production Floor B',
          active: true
        },
        {
          name: 'Industrial Sewing #1',
          type: 'SEWING',
          model: 'Juki DDL-8700',
          location: 'Sewing Line 1',
          active: true
        }
      ]

      for (const machineData of machines) {
        await prisma.machine.create({
          data: {
            workspace_id: workspace.id,
            name: machineData.name,
            workcenter: machineData.type as any,
            spec: { 
              model: machineData.model, 
              location: machineData.location 
            },
            is_active: machineData.active
          }
        })
      }
      console.log(`✅ Created ${machines.length} sample machines`)
    } else {
      console.log(`✅ Found ${existingMachines} existing machines`)
    }

    // 6. Create sample sewing operations
    console.log('✂️  Setting up sewing operations...')
    const existingOperations = await prisma.sewingOperation.count()
    
    if (existingOperations === 0) {
      const operations = [
        {
          workspaceId: 'default',
          productType: 'Tee',
          name: 'Join Shoulders',
          standardMinutes: 3.5,
          pieceRate: 2.50,
          dependsOn: '[]'
        },
        {
          workspaceId: 'default',
          productType: 'Tee',
          name: 'Attach Collar',
          standardMinutes: 4.2,
          pieceRate: 3.00,
          dependsOn: '["Join Shoulders"]'
        },
        {
          workspaceId: 'default',
          productType: 'Tee',
          name: 'Side Seams',
          standardMinutes: 2.8,
          pieceRate: 2.00,
          dependsOn: '[]'
        },
        {
          workspaceId: 'default',
          productType: 'Tee',
          name: 'Hem Bottom',
          standardMinutes: 2.0,
          pieceRate: 1.50,
          dependsOn: '["Side Seams"]'
        },
        {
          workspaceId: 'default',
          productType: 'Tee',
          name: 'Final Assembly',
          standardMinutes: 1.5,
          pieceRate: 1.00,
          dependsOn: '["Attach Collar", "Hem Bottom"]'
        }
      ]

      for (const opData of operations) {
        await prisma.sewingOperation.create({
          data: {
            workspace_id: workspace.id,
            product_type: opData.productType,
            name: opData.name,
            standard_minutes: opData.standardMinutes,
            piece_rate: opData.pieceRate,
            depends_on: JSON.parse(opData.dependsOn || '[]')
          }
        })
      }
      console.log(`✅ Created ${operations.length} sewing operations`)
    } else {
      console.log(`✅ Found ${existingOperations} existing sewing operations`)
    }

    // 7. Create sample AI insights for demonstration
    console.log('🧠 Creating sample AI insights...')
    await prisma.aIInsight.createMany({
      data: [
        {
          workspace_id: workspace.id,
          type: 'FORECAST',
          title: 'Peak Season Approaching',
          message: 'Historical data shows 40% increase in orders during Q4. Consider increasing inventory levels.',
          priority: 'MEDIUM',
          data: { seasonality: 'Q4', expectedIncrease: 0.4 }
        },
        {
          workspace_id: workspace.id,
          type: 'INVENTORY',
          title: 'Low Stock Alert',
          message: 'Black cotton fabric approaching reorder point. Consider restocking soon.',
          priority: 'HIGH',
          data: { item: 'Cotton Fabric - Black', currentLevel: 22, reorderPoint: 20 }
        },
        {
          workspace_id: workspace.id,
          type: 'ASSIGNMENT',
          title: 'Operator Efficiency Optimization',
          message: 'Reassigning shoulder join operations could improve line efficiency by 15%.',
          priority: 'MEDIUM',
          data: { operation: 'Join Shoulders', efficiencyGain: 0.15 }
        }
      ]
    })
    console.log('✅ Sample AI insights created')

    console.log('\n🎉 ASH AI System initialization complete!')
    console.log('\nSystem is ready for:')
    console.log('- ✅ Order intake with AI validation')
    console.log('- ✅ Routing templates and customization')
    console.log('- ✅ Capacity analysis')
    console.log('- ✅ Material requirement checking')
    console.log('- ✅ Event-driven workflow')
    console.log('- ✅ Audit logging')
    console.log('\nNext steps:')
    console.log('1. Create admin user with appropriate roles')
    console.log('2. Test PO creation flow')
    console.log('3. Configure Ashley AI parameters for your specific needs')
    console.log('4. Set up production workstations')

  } catch (error) {
    console.error('❌ Error initializing ASH system:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  initializeAshSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { initializeAshSystem }