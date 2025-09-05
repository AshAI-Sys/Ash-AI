const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔌 Testing ASH AI database connection...');
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    
    // Test creating a workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'ASH AI Main Workspace',
        settings: { timezone: 'Asia/Manila', currency: 'PHP' },
        active: true,
      },
    });
    console.log('✅ Workspace created:', workspace.name);
    
    // Test creating a brand
    const brand = await prisma.brand.create({
      data: {
        workspace_id: workspace.id,
        name: 'Sorbetes',
        code: 'SORB',
        settings: { 
          margin_floor: 0.25,
          routing_defaults: { silkscreen: 'SILK_OPTION_A' }
        },
      },
    });
    console.log('✅ Brand created:', brand.name);
    
    // Test creating a client
    const client = await prisma.client.create({
      data: {
        workspace_id: workspace.id,
        name: 'Test Client',
        company: 'Test Company Inc.',
        emails: ['test@example.com'],
        phones: ['+639171234567'],
        billing_address: {
          street: '123 Test St',
          city: 'Makati',
          province: 'Metro Manila',
          postal_code: '1200'
        },
      },
    });
    console.log('✅ Client created:', client.name);
    
    // Test audit logging
    await prisma.auditLog.create({
      data: {
        workspace_id: workspace.id,
        actor_id: null,
        entity_type: 'workspace',
        entity_id: workspace.id,
        action: 'CREATE',
        after_data: JSON.stringify({ name: workspace.name }),
      },
    });
    console.log('✅ Audit log created successfully!');
    
    console.log('🚀 ASH AI database is ready for Phase 1 implementation!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();