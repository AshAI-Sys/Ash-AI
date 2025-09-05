import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function seedSampleData() {
  console.log('🌱 Seeding sample data for ASH AI system...')

  try {
    // Create workspace
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
    console.log('✅ Workspace created')

    // Create brands
    const brands = await Promise.all([
      prisma.brand.upsert({
        where: { code: 'REEF' },
        update: {},
        create: {
          name: 'Reefer',
          code: 'REEF',
          workspace_id: 'default',
          settings: {
            defaultMargin: 0.3,
            printingMethods: ['SILKSCREEN', 'DTF'],
            colors: ['Black', 'White', 'Navy', 'Gray']
          }
        }
      }),
      prisma.brand.upsert({
        where: { code: 'SORB' },
        update: {},
        create: {
          name: 'Sorbetes',
          code: 'SORB',
          workspace_id: 'default',
          settings: {
            defaultMargin: 0.35,
            printingMethods: ['SUBLIMATION', 'EMBROIDERY'],
            colors: ['White', 'Light Blue', 'Pink', 'Yellow']
          }
        }
      })
    ])
    console.log('✅ Brands created')

    // Create sample clients
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { id: 'client-1' },
        update: {},
        create: {
          id: 'client-1',
          workspace_id: 'default',
          name: 'Clark Safari & Adventure Park',
          company: 'Clark Safari & Adventure Park',
          emails: ['ops@clarksafari.ph', 'purchasing@clarksafari.ph'],
          phones: ['+63-9XX-XXX-XXXX'],
          billing_address: {
            street: 'Clark Freeport Zone',
            city: 'Angeles City',
            province: 'Pampanga',
            zipCode: '2023'
          }
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-2' },
        update: {},
        create: {
          id: 'client-2',
          workspace_id: 'default',
          name: 'Tech Startup Inc.',
          company: 'Tech Startup Inc.',
          emails: ['orders@techstartup.ph'],
          phones: ['+63-9YY-YYY-YYYY'],
          billing_address: {
            street: 'BGC High Street',
            city: 'Taguig City',
            province: 'Metro Manila',
            zipCode: '1634'
          }
        }
      })
    ])
    console.log('✅ Sample clients created')

    // Create route templates
    const templates = await Promise.all([
      prisma.routeTemplate.upsert({
        where: { id: 'template-silk-a' },
        update: {},
        create: {
          id: 'template-silk-a',
          template_key: 'SILK_OPTION_A',
          name: 'Silkscreen Option A (Default)',
          method: 'SILKSCREEN',
          steps: [
            {
              name: 'Cutting',
              workcenter: 'CUTTING',
              sequence: 1,
              depends_on: [],
              standard_spec: { time_per_pc: 0.6 }
            },
            {
              name: 'Printing',
              workcenter: 'PRINTING',
              sequence: 2,
              depends_on: ['Cutting'],
              standard_spec: { setup_time: 30, print_time_per_pc: 1.2 }
            },
            {
              name: 'Sewing',
              workcenter: 'SEWING',
              sequence: 3,
              depends_on: ['Printing'],
              standard_spec: { time_per_pc: 8.5 }
            },
            {
              name: 'Quality Control',
              workcenter: 'QC',
              sequence: 4,
              depends_on: ['Sewing'],
              standard_spec: { sample_size: '10%', time_per_sample: 2 }
            },
            {
              name: 'Packing',
              workcenter: 'PACKING',
              sequence: 5,
              depends_on: ['Quality Control'],
              standard_spec: { time_per_pc: 0.3 }
            }
          ]
        }
      })
    ])
    console.log('✅ Route templates created')

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@sorbetes.ph' },
      update: {},
      create: {
        email: 'admin@sorbetes.ph',
        full_name: 'System Administrator',
        password: '$2b$10$K7L1OJ45/4Y2nIiO0JhDOeWfpb9nJzM0qZb8zIvQ5TpVzVjTw3y9i', // "password123"
        role: 'ADMIN',
        active: true,
        permissions: {
          orders: ['create', 'edit', 'view', 'delete'],
          routing: ['apply_template', 'customize'],
          clients: ['create', 'edit', 'view'],
          admin: ['manage_users', 'system_settings']
        }
      }
    })
    console.log('✅ Admin user created')

    console.log('🎉 Sample data seeding completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   • Workspace: ${workspace.name}`)
    console.log(`   • Brands: ${brands.length}`)
    console.log(`   • Clients: ${clients.length}`)
    console.log(`   • Route Templates: ${templates.length}`)
    console.log(`   • Admin User: ${adminUser.email}`)
    console.log('')
    console.log('🚀 Ready to test order creation!')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedSampleData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })