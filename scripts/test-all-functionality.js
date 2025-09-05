import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
const prisma = new PrismaClient()

async function testAllFunctionality() {
  console.log('🔍 COMPREHENSIVE ASH AI SYSTEM TEST')
  console.log('===================================')
  
  let passedTests = 0
  let failedTests = 0
  
  const testResult = (name, passed, details = '') => {
    if (passed) {
      console.log(`✅ ${name}`)
      passedTests++
    } else {
      console.log(`❌ ${name} - ${details}`)
      failedTests++
    }
  }

  try {
    // 1. DATABASE CONNECTION TEST
    console.log('\n📊 DATABASE TESTS:')
    
    try {
      await prisma.$connect()
      testResult('Database Connection', true)
    } catch (error) {
      testResult('Database Connection', false, error.message)
    }

    // 2. DATA INTEGRITY TESTS
    try {
      const [workspaces, brands, clients, users] = await Promise.all([
        prisma.workspace.count(),
        prisma.brand.count(),
        prisma.client.count(),
        prisma.user.count()
      ])
      
      testResult('Workspace Data', workspaces > 0, `Found: ${workspaces}`)
      testResult('Brands Data', brands > 0, `Found: ${brands}`)
      testResult('Clients Data', clients > 0, `Found: ${clients}`)
      testResult('Users Data', users > 0, `Found: ${users}`)
    } catch (error) {
      testResult('Data Integrity', false, error.message)
    }

    // 3. SCHEMA VALIDATION TESTS
    console.log('\n🗄️ SCHEMA TESTS:')
    
    // Test all critical models exist
    const criticalModels = [
      'workspace', 'brand', 'client', 'user', 'order', 'routingStep', 
      'orderAttachment', 'auditLog', 'routeTemplate', 'task', 'qCRecord'
    ]
    
    for (const model of criticalModels) {
      try {
        const count = await prisma[model].count()
        testResult(`${model.charAt(0).toUpperCase() + model.slice(1)} Model`, true, `${count} records`)
      } catch (error) {
        testResult(`${model.charAt(0).toUpperCase() + model.slice(1)} Model`, false, 'Model not accessible')
      }
    }

    // 4. ORDER WORKFLOW TESTS
    console.log('\n📋 ORDER WORKFLOW TESTS:')
    
    try {
      const orders = await prisma.order.findMany({
        include: {
          routing_steps: true,
          brand: true,
          client: true
        },
        take: 5
      })
      
      testResult('Order Retrieval', orders.length > 0, `Found ${orders.length} orders`)
      
      if (orders.length > 0) {
        const firstOrder = orders[0]
        testResult('Order-Brand Relationship', !!firstOrder.brand, firstOrder.brand?.name)
        testResult('Order-Client Relationship', !!firstOrder.client, firstOrder.client?.name)
        testResult('Routing Steps', firstOrder.routing_steps.length > 0, `${firstOrder.routing_steps.length} steps`)
        testResult('PO Number Format', firstOrder.po_number?.includes('-'), firstOrder.po_number)
      }
    } catch (error) {
      testResult('Order Workflow', false, error.message)
    }

    // 5. FILE STRUCTURE TESTS
    console.log('\n📁 FILE STRUCTURE TESTS:')
    
    
    const criticalFiles = [
      'src/app/page.tsx',
      'src/app/dashboard/page.tsx',
      'src/app/orders/new/page.tsx',
      'src/app/api/ash/orders/route.ts',
      'src/app/api/brands/route.ts',
      'src/app/api/clients/route.ts',
      'src/components/Layout.tsx',
      'src/lib/auth.ts',
      'src/lib/db.ts',
      'src/lib/prisma.ts',
      'prisma/schema.prisma'
    ]
    
    for (const file of criticalFiles) {
      const filePath = path.join(process.cwd(), file)
      testResult(file, fs.existsSync(filePath))
    }

    // 6. API ENDPOINTS TEST (structural)
    console.log('\n🌐 API ENDPOINTS (Structure):')
    
    const apiEndpoints = [
      'src/app/api/ash/orders/route.ts',
      'src/app/api/brands/route.ts', 
      'src/app/api/clients/route.ts',
      'src/app/api/auth/[...nextauth]/route.ts',
      'src/app/api/inventory/route.ts',
      'src/app/api/qc/route.ts',
      'src/app/api/tasks/route.ts'
    ]
    
    for (const endpoint of apiEndpoints) {
      const filePath = path.join(process.cwd(), endpoint)
      testResult(endpoint.replace('src/app/api/', '/api/').replace('/route.ts', ''), fs.existsSync(filePath))
    }

    // 7. COMPONENT TESTS
    console.log('\n🧩 COMPONENT TESTS:')
    
    const components = [
      'src/components/Layout.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/input.tsx'
    ]
    
    for (const component of components) {
      const filePath = path.join(process.cwd(), component)
      testResult(component.replace('src/components/', ''), fs.existsSync(filePath))
    }

    // 8. PAGE ROUTING TESTS
    console.log('\n🔀 PAGE ROUTING TESTS:')
    
    const pages = [
      'src/app/page.tsx',
      'src/app/dashboard/page.tsx',
      'src/app/orders/page.tsx',
      'src/app/orders/new/page.tsx',
      'src/app/inventory/page.tsx',
      'src/app/qc/page.tsx',
      'src/app/design/page.tsx',
      'src/app/sewing/page.tsx',
      'src/app/printing/page.tsx'
    ]
    
    for (const page of pages) {
      const filePath = path.join(process.cwd(), page)
      const route = page.replace('src/app', '').replace('/page.tsx', '') || '/'
      testResult(`Route: ${route}`, fs.existsSync(filePath))
    }

    // 9. CONFIGURATION TESTS
    console.log('\n⚙️ CONFIGURATION TESTS:')
    
    const configFiles = [
      'package.json',
      'next.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      '.env'
    ]
    
    for (const config of configFiles) {
      const filePath = path.join(process.cwd(), config)
      testResult(config, fs.existsSync(filePath))
    }

    // 10. ASH AI SYSTEM TESTS
    console.log('\n🤖 ASH AI SYSTEM TESTS:')
    
    const ashFiles = [
      'src/lib/ash/ashley.ts',
      'src/lib/ash/ashley-ai.ts',
      'src/lib/ash/audit.ts',
      'src/lib/ash/event-bus.ts',
      'src/lib/ash/routing-templates.ts',
      'src/lib/ash/po-generator.ts'
    ]
    
    for (const ashFile of ashFiles) {
      const filePath = path.join(process.cwd(), ashFile)
      testResult(ashFile.replace('src/lib/ash/', 'ASH: '), fs.existsSync(filePath))
    }

  } catch (error) {
    console.error('❌ Test suite error:', error)
    failedTests++
  }

  // SUMMARY
  console.log('\n📊 TEST SUMMARY:')
  console.log('================')
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!')
    console.log('Ready for full ASH AI deployment!')
  } else {
    console.log('\n⚠️ ISSUES FOUND - Needs attention before production')
  }

  console.log('\n🔗 ACCESS POINTS:')
  console.log('- Main App: http://localhost:3007')
  console.log('- Dashboard: http://localhost:3007/dashboard') 
  console.log('- New Order: http://localhost:3007/orders/new')
  console.log('- Admin Login: admin@sorbetes.ph / password123')

  await prisma.$disconnect()
}

testAllFunctionality()
  .catch(console.error)