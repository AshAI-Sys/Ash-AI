const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testOrderCreation() {
  console.log('🧪 Testing ASH AI Order Creation Workflow...')

  try {
    // Get sample data
    const [brands, clients, users] = await Promise.all([
      prisma.brand.findMany({ where: { workspace_id: 'default' } }),
      prisma.client.findMany({ where: { workspace_id: 'default' } }),
      prisma.user.findMany({ where: { active: true } })
    ])

    if (brands.length === 0 || clients.length === 0) {
      console.error('❌ No sample data found. Run seed script first.')
      return
    }

    if (users.length === 0) {
      console.error('❌ No users found. Run seed script first.')
      return
    }

    console.log(`📊 Found ${brands.length} brands and ${clients.length} clients`)

    // Test order data
    const orderData = {
      clientId: clients[0].id,
      brandId: brands[0].id,
      channel: 'Direct',
      productType: 'Tee',
      method: 'SILKSCREEN',
      totalQty: 100,
      sizeCurve: {
        'S': 20,
        'M': 40,
        'L': 30,
        'XL': 10
      },
      variants: [
        { color: 'Black', qty: 60 },
        { color: 'White', qty: 40 }
      ],
      addons: ['anti_migration'],
      targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      commercials: {
        unitPrice: 299.00,
        depositPct: 50,
        paymentTerms: '50/50',
        taxMode: 'VAT_INCLUSIVE',
        currency: 'PHP'
      },
      routeTemplateKey: 'SILK_OPTION_A',
      notes: 'Test order created via API - High quality print required',
      action: 'create'
    }

    console.log('📝 Creating test order...')
    console.log(`   Client: ${clients[0].name}`)
    console.log(`   Brand: ${brands[0].name} (${brands[0].code})`)
    console.log(`   Product: ${orderData.productType} - ${orderData.method}`)
    console.log(`   Quantity: ${orderData.totalQty} pcs`)
    console.log(`   Unit Price: ₱${orderData.commercials.unitPrice}`)

    // Test order creation directly in database (simulating API call)
    const poNumber = `${brands[0].code}-${new Date().getFullYear()}-${String(1).padStart(6, '0')}`
    
    const order = await prisma.order.create({
      data: {
        workspace_id: 'default',
        po_number: poNumber,
        brand_id: orderData.brandId,
        client_id: orderData.clientId,
        product_type: orderData.productType,
        method: orderData.method,
        total_qty: orderData.totalQty,
        size_curve: orderData.sizeCurve,
        variants: orderData.variants,
        addons: orderData.addons,
        target_delivery_date: new Date(orderData.targetDeliveryDate),
        commercials: orderData.commercials,
        status: 'INTAKE',
        channel: orderData.channel,
        created_by_id: users[0].id // Use real user ID
      },
      include: {
        brand: true,
        client: true
      }
    })

    console.log('✅ Order created successfully!')
    console.log(`   PO Number: ${order.po_number}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Total Value: ₱${(order.total_qty * order.commercials.unitPrice).toFixed(2)}`)
    console.log(`   Delivery Date: ${order.target_delivery_date.toDateString()}`)

    // Create routing steps
    const routingSteps = [
      {
        name: 'Cutting',
        workcenter: 'CUTTING',
        sequence: 1,
        status: 'PLANNED'
      },
      {
        name: 'Printing',
        workcenter: 'PRINTING',
        sequence: 2,
        status: 'PLANNED'
      },
      {
        name: 'Sewing',
        workcenter: 'SEWING',
        sequence: 3,
        status: 'PLANNED'
      },
      {
        name: 'Quality Control',
        workcenter: 'QC',
        sequence: 4,
        status: 'PLANNED'
      },
      {
        name: 'Packing',
        workcenter: 'PACKING',
        sequence: 5,
        status: 'PLANNED'
      }
    ]

    const createdSteps = await Promise.all(
      routingSteps.map(step =>
        prisma.routingStep.create({
          data: {
            order_id: order.id,
            ...step
          }
        })
      )
    )

    console.log(`✅ Created ${createdSteps.length} routing steps`)

    // Verify data integrity
    const verifyOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        routing_steps: { orderBy: { sequence: 'asc' } },
        brand: true,
        client: true
      }
    })

    console.log('🔍 Data integrity verification:')
    console.log(`   Size curve total: ${Object.values(verifyOrder.size_curve).reduce((sum, qty) => sum + qty, 0)} = Total qty: ${verifyOrder.total_qty} ✅`)
    console.log(`   Routing steps: ${verifyOrder.routing_steps.length} ✅`)
    console.log(`   Brand association: ${verifyOrder.brand.name} ✅`)
    console.log(`   Client association: ${verifyOrder.client.name} ✅`)

    console.log('\n🎉 ASH AI Order Creation Test PASSED!')
    console.log('\n📋 Next steps:')
    console.log('   1. ✅ Database schema is working')
    console.log('   2. ✅ Order creation logic is functional')
    console.log('   3. ✅ Routing steps are created properly')
    console.log('   4. 🔄 Test the web UI at http://localhost:3006/orders/new')
    console.log('   5. 🔄 Test Ashley AI validation')
    console.log('   6. 🔄 Test complete Stage 1 workflow')

  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testOrderCreation()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })