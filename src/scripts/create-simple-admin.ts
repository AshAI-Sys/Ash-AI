import { db } from '../lib/db'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: 'admin@ashui.com' }
    })

    if (existingUser) {
      console.log('✅ Test user already exists!')
      console.log('📧 Email: admin@ashui.com')
      console.log('🔑 Password: admin123')
      await db.$disconnect()
      return existingUser
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12)

    // Create test admin user (simplified to match actual schema)
    const user = await db.user.create({
      data: {
        email: 'admin@ashui.com',
        password: hashedPassword,
        full_name: 'ASH AI Administrator',
        role: Role.ADMIN,
        active: true,
        permissions: {
          can_create_orders: true,
          can_manage_users: true,
          can_view_reports: true,
          can_manage_settings: true,
          can_approve_designs: true,
          can_manage_inventory: true
        }
      }
    })

    console.log('🎉 Test user created successfully!')
    console.log('📧 Email: admin@ashui.com')
    console.log('🔑 Password: admin123')
    console.log('👤 Role: ADMIN')

    await db.$disconnect()
    return user
  } catch (error) {
    console.error('❌ Error creating test user:', error)
    await db.$disconnect()
    process.exit(1)
  }
}

createTestUser()