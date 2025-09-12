// @ts-nocheck
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 ASH AI: Initializing Futuristic ERP Database...')
  console.log('🤖 Loading Neural Network Components...')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const workspace_id = 'ash_ai_main_workspace'

  // Create workspace first
  const _workspace = await prisma.workspace.upsert({
    where: { id: workspace_id },
    update: {},
    create: {
      id: workspace_id,
      name: 'ASH AI Main Workspace',
      settings: {
        theme: 'futuristic',
        ai_enabled: true
      }
    }
  })

  // 🧠 Create AI-Enhanced User Accounts
  console.log('🧠 Creating AI-Enhanced User Accounts...')
  
  const _admin = await prisma.user.upsert({
    where: { email: 'admin@ash-ai.com' },
    update: {},
    create: {
      email: 'admin@ash-ai.com',
      full_name: 'ASH AI System Administrator',
      password: hashedPassword,
      role: Role.ADMIN,
      permissions: {
        all_access: true,
        ai_management: true,
        system_config: true,
        user_management: true,
        financial_access: true
      },
      workspace_id: workspace_id,
    },
  })

  const _manager = await prisma.user.upsert({
    where: { email: 'manager@ash-ai.com' },
    update: {},
    create: {
      email: 'manager@ash-ai.com',
      full_name: 'Neural Production Manager',
      password: hashedPassword,
      role: Role.MANAGER,
      hourly_rate: 750.0,
      permissions: {
        production_management: true,
        routing_customization: true,
        team_management: true,
        quality_oversight: true
      },
      workspace_id: workspace_id,
    },
  })

  const _ashley_ai = await prisma.user.upsert({
    where: { email: 'ashley@ash-ai.com' },
    update: {},
    create: {
      email: 'ashley@ash-ai.com',
      full_name: 'Ashley - AI Production Assistant',
      password: hashedPassword,
      role: Role.ADMIN,
      permissions: {
        ai_agent: true,
        predictive_analytics: true,
        optimization_engine: true,
        neural_insights: true
      },
      workspace_id: workspace_id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'designer@example.com' },
    update: {},
    create: {
      email: 'designer@example.com',
      full_name: 'Graphic Artist',
      password: hashedPassword,
      role: Role.GRAPHIC_ARTIST,
      workspace_id: workspace_id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'sewing@example.com' },
    update: {},
    create: {
      email: 'sewing@example.com',
      full_name: 'Sewing Operator',
      password: hashedPassword,
      role: Role.SEWING_OPERATOR,
      workspace_id: workspace_id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'qc@example.com' },
    update: {},
    create: {
      email: 'qc@example.com',
      full_name: 'QC Inspector',
      password: hashedPassword,
      role: Role.QC_INSPECTOR,
      workspace_id: workspace_id,
    },
  })

  const _reefer = await prisma.brand.upsert({
    where: { 
      workspace_id_code: {
        workspace_id: workspace_id,
        code: 'REF'
      }
    },
    update: {},
    create: {
      workspace_id: workspace_id,
      name: 'Reefer',
      code: 'REF',
    },
  })

  const _sorbetes = await prisma.brand.upsert({
    where: { 
      workspace_id_code: {
        workspace_id: workspace_id,
        code: 'SOR'
      }
    },
    update: {},
    create: {
      workspace_id: workspace_id,
      name: 'Sorbetes',
      code: 'SOR',
    },
  })

  console.log('📦 Creating Inventory Items...')
  await prisma.inventoryItem.upsert({
    where: { sku: 'CT-WHT-001' },
    update: {},
    create: {
      workspace_id: workspace_id,
      name: 'White Cotton T-Shirt',
      sku: 'CT-WHT-001',
      category: 'Apparel',
      quantity: 100,
      unit: 'pieces',
      unit_cost: 5.50,
    },
  })

  await prisma.inventoryItem.upsert({
    where: { sku: 'CT-BLK-001' },
    update: {},
    create: {
      workspace_id: workspace_id,
      name: 'Black Cotton T-Shirt',
      sku: 'CT-BLK-001',
      category: 'Apparel',
      quantity: 75,
      unit: 'pieces',
      unit_cost: 5.50,
    },
  })

  await prisma.inventoryItem.upsert({
    where: { sku: 'INK-BLU-001' },
    update: {},
    create: {
      workspace_id: workspace_id,
      name: 'Screen Printing Ink - Blue',
      sku: 'INK-BLU-001',
      category: 'Printing Materials',
      quantity: 50,
      unit: 'bottles',
      unit_cost: 12.00,
    },
  })

  console.log('💰 Creating Wallets...')
  // Check if wallets already exist
  const walletCount = await prisma.wallet.count({ where: { workspace_id: workspace_id } })
  if (walletCount === 0) {
    await prisma.wallet.createMany({
      data: [
        { workspace_id: workspace_id, owner_type: 'WORKSPACE', owner_id: workspace_id, balance: 50000.00 },
        { workspace_id: workspace_id, owner_type: 'WORKSPACE', owner_id: workspace_id, balance: 15000.00 },
      ],
    })
  }

  console.log('🚗 Creating Vehicles...')
  await prisma.vehicle.upsert({
    where: { plate_no: 'ABC-123' },
    update: {},
    create: {
      workspace_id: workspace_id,
      plate_no: 'ABC-123',
      type: 'Van',
    },
  })

  await prisma.vehicle.upsert({
    where: { plate_no: 'DEF-456' },
    update: {},
    create: {
      workspace_id: workspace_id,
      plate_no: 'DEF-456',
      type: 'Motorcycle',
    },
  })

  console.log('Seed data created successfully!')
  console.log('Admin login: admin@example.com / admin123')
  console.log('Manager login: manager@example.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })