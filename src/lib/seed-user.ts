import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

export async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@ashui.com' }
    })

    if (existingUser) {
      console.log('Test user already exists!')
      return existingUser
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12)

    // Create workspace first
    const _workspace = await prisma.workspace.create({
      data: {
        id: crypto.randomUUID(),
        name: 'ASH AI Demo Workspace',
        active: true,
        settings: {
          currency: 'PHP',
          timezone: 'Asia/Manila',
          default_fabric_units: 'METERS',
          quality_standards: 'PREMIUM'
        }
      }
    })

    // Create test admin user
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        workspace_id: workspace.id,
        email: 'admin@ashui.com',
        password: hashedPassword,
        full_name: 'ASH AI Administrator',
        role: Role.ADMIN,
        active: true,
        email_verified: new Date(),
        profile: {
          phone: '+63 917 123 4567',
          department: 'MANAGEMENT',
          position: 'System Administrator'
        },
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

    console.log('✅ Test user created successfully!')
    console.log('📧 Email: admin@ashui.com')
    console.log('🔑 Password: admin123')
    console.log('👤 Role: ADMIN')

    return user
  } catch (_error) {
    console.error('❌ Error creating test user:', _error)
    throw _error
  }
}