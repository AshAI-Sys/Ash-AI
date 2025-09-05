import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedUsers() {
  try {
    console.log('🚀 Creating ASH AI demo users...')

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Create Admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        full_name: 'ASH AI Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        brand_scope: ['reefer', 'sorbetes'],
        hourly_rate: 500.0,
        is_subcontractor: false,
        active: true
      }
    })
    console.log('✅ Admin user created:', admin.email)

    // Create Manager user
    const manager = await prisma.user.create({
      data: {
        email: 'manager@example.com',
        full_name: 'Production Manager',
        password: hashedPassword,
        role: 'MANAGER',
        brand_scope: ['reefer', 'sorbetes'],
        hourly_rate: 350.0,
        is_subcontractor: false,
        active: true
      }
    })
    console.log('✅ Manager user created:', manager.email)

    // Create sample brands
    const brand1 = await prisma.brand.create({
      data: {
        name: 'Reefer',
        code: 'REEF',
        commission_rules: { default: 15, premium: 20 },
        return_policies: { days: 30, conditions: ['unworn', 'with_tags'] },
        active: true
      }
    })

    const brand2 = await prisma.brand.create({
      data: {
        name: 'Sorbetes',
        code: 'SORB',
        commission_rules: { default: 12, premium: 18 },
        return_policies: { days: 14, conditions: ['unworn'] },
        active: true
      }
    })
    console.log('✅ Brands created:', brand1.name, brand2.name)

    // Create sample roles
    const roles = [
      { email: 'artist@example.com', name: 'Ashley Chen', role: 'GRAPHIC_ARTIST' },
      { email: 'silk@example.com', name: 'Mike Torres', role: 'SILKSCREEN_OPERATOR' },
      { email: 'dtf@example.com', name: 'Sarah Kim', role: 'DTF_OPERATOR' },
      { email: 'qc@example.com', name: 'John Quality', role: 'QC_INSPECTOR' },
      { email: 'driver@example.com', name: 'Roy Driver', role: 'DRIVER' }
    ]

    for (const roleData of roles) {
      await prisma.user.create({
        data: {
          email: roleData.email,
          full_name: roleData.name,
          password: hashedPassword,
          role: roleData.role,
          brand_scope: ['reefer'],
          hourly_rate: 250.0,
          is_subcontractor: false,
          active: true
        }
      })
      console.log(`✅ ${roleData.role} user created:`, roleData.email)
    }

    console.log('\n🎉 ASH AI demo users setup complete!')
    console.log('\n🔑 Login credentials:')
    console.log('Admin: admin@example.com / admin123')
    console.log('Manager: manager@example.com / admin123')
    console.log('Artist: artist@example.com / admin123')
    console.log('QC: qc@example.com / admin123')
    
  } catch (error) {
    console.error('❌ Error seeding users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedUsers()