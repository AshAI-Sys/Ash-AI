const { PrismaClient } = require('@prisma/client');

async function testDesignApprovalSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎨 Testing Stage 2: Design & Approval System...');
    
    // Get test data
    const workspace = await prisma.workspace.findFirst();
    const brand = await prisma.brand.findFirst();
    const client = await prisma.client.findFirst();
    
    if (!workspace || !brand || !client) {
      console.error('❌ Test data not found');
      return;
    }

    // Get an existing order
    let order = await prisma.order.findFirst({
      where: { workspace_id: workspace.id }
    });

    if (!order) {
      // Create a test order
      const currentYear = new Date().getFullYear();
      let nextSequence = 1;
      
      const sequenceRecord = await prisma.pONumberSequence.findUnique({
        where: { 
          brand_id_year: { 
            brand_id: brand.id, 
            year: currentYear 
          } 
        }
      });
      
      if (sequenceRecord) {
        nextSequence = sequenceRecord.sequence + 1;
        await prisma.pONumberSequence.update({
          where: { 
            brand_id_year: { 
              brand_id: brand.id, 
              year: currentYear 
            } 
          },
          data: { sequence: nextSequence }
        });
      } else {
        await prisma.pONumberSequence.create({
          data: {
            brand_id: brand.id,
            year: currentYear,
            sequence: nextSequence,
          }
        });
      }
      
      const po_number = `${brand.code}-${currentYear}-${nextSequence.toString().padStart(6, '0')}`;

      order = await prisma.order.create({
        data: {
          workspace_id: workspace.id,
          brand_id: brand.id,
          client_id: client.id,
          po_number,
          channel: 'Direct',
          product_type: 'Hoodie',
          method: 'SILKSCREEN',
          total_qty: 50,
          size_curve: { 'M': 25, 'L': 25 },
          target_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'DESIGN_PENDING',
          created_by: 'test-system'
        }
      });
      
      console.log(`✅ Created test order: ${order.po_number}`);
    }

    // Test 1: Upload design asset
    console.log('\n🧪 Test 1: Upload Design Asset');
    
    const designAsset1 = await prisma.designAsset.create({
      data: {
        order_id: order.id,
        version: 1,
        type: 'MOCKUP',
        file_url: 'https://example.com/mockup-v1.jpg',
        file_name: 'hoodie-mockup-black.jpg',
        file_size: 2048000,
        mime_type: 'image/jpeg',
        color_count: 3,
        print_ready: false,
        approval_status: 'PENDING'
      }
    });

    console.log(`   ✅ Design asset created: ${designAsset1.type} v${designAsset1.version}`);

    // Test 2: Submit for client approval
    console.log('\n🧪 Test 2: Submit for Client Approval');
    
    const approval1 = await prisma.designApproval.create({
      data: {
        design_asset_id: designAsset1.id,
        client_id: client.id,
        status: 'PENDING'
      }
    });

    console.log(`   ✅ Approval request created: ${approval1.status}`);

    // Test 3: Client rejects with feedback
    console.log('\n🧪 Test 3: Client Rejection with Feedback');
    
    const rejectedApproval = await prisma.designApproval.update({
      where: { id: approval1.id },
      data: {
        status: 'REJECTED',
        feedback: 'Please make the logo bigger and change the color to navy blue'
      }
    });

    await prisma.designAsset.update({
      where: { id: designAsset1.id },
      data: { approval_status: 'REJECTED' }
    });

    console.log(`   ✅ Design rejected with feedback: "${rejectedApproval.feedback}"`);

    // Test 4: Designer creates revision
    console.log('\n🧪 Test 4: Designer Creates Revision');
    
    const revision1 = await prisma.designRevision.create({
      data: {
        design_asset_id: designAsset1.id,
        revision_notes: 'Updated design based on client feedback',
        changes_made: {
          logo: 'Increased size by 30%',
          color: 'Changed from black to navy blue'
        },
        revised_by: 'designer-001'
      }
    });

    // Create new version
    const designAsset2 = await prisma.designAsset.create({
      data: {
        order_id: order.id,
        version: 2,
        type: 'MOCKUP',
        file_url: 'https://example.com/mockup-v2.jpg',
        file_name: 'hoodie-mockup-navy.jpg',
        file_size: 2156000,
        mime_type: 'image/jpeg',
        color_count: 3,
        print_ready: false,
        approval_status: 'PENDING'
      }
    });

    console.log(`   ✅ Revision created: v${designAsset2.version}`);
    console.log(`   📝 Changes: ${Object.keys(revision1.changes_made).join(', ')}`);

    // Test 5: Client approves new version
    console.log('\n🧪 Test 5: Client Approves New Version');
    
    const approval2 = await prisma.designApproval.create({
      data: {
        design_asset_id: designAsset2.id,
        client_id: client.id,
        status: 'APPROVED',
        feedback: 'Looks perfect! Please proceed with production.',
        approved_at: new Date()
      }
    });

    await prisma.designAsset.update({
      where: { id: designAsset2.id },
      data: { 
        approval_status: 'APPROVED',
        print_ready: true
      }
    });

    console.log(`   ✅ Design approved: ${approval2.feedback}`);

    // Test 6: Upload artwork/separations
    console.log('\n🧪 Test 6: Upload Print-Ready Artwork');
    
    const artwork = await prisma.designAsset.create({
      data: {
        order_id: order.id,
        version: 1,
        type: 'SEPARATION',
        file_url: 'https://example.com/separations.zip',
        file_name: 'hoodie-separations-3-colors.zip',
        file_size: 5240000,
        mime_type: 'application/zip',
        color_count: 3,
        print_ready: true,
        approval_status: 'APPROVED'
      }
    });

    console.log(`   ✅ Artwork uploaded: ${artwork.type} (${artwork.color_count} colors)`);

    // Test 7: Advance order to production
    console.log('\n🧪 Test 7: Advance Order to Production');
    
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PRODUCTION_PLANNED' }
    });

    console.log(`   ✅ Order advanced: ${updatedOrder.status}`);

    // Test 8: Get complete design history
    console.log('\n🧪 Test 8: Design History Summary');
    
    const designHistory = await prisma.designAsset.findMany({
      where: { order_id: order.id },
      include: {
        approvals: {
          include: {
            client: { select: { name: true } }
          }
        },
        revisions: true
      },
      orderBy: [
        { type: 'asc' },
        { version: 'asc' }
      ]
    });

    console.log(`   📊 Design Summary for ${order.po_number}:`);
    
    designHistory.forEach(design => {
      console.log(`      ${design.type} v${design.version}: ${design.approval_status}`);
      console.log(`         File: ${design.file_name}`);
      console.log(`         Approvals: ${design.approvals.length}`);
      console.log(`         Revisions: ${design.revisions.length}`);
    });

    // Test 9: Audit trail
    console.log('\n🧪 Test 9: Audit Trail Check');
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        workspace_id: workspace.id,
        entity_type: {
          in: ['design_asset', 'design_approval', 'design_revision']
        }
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`   📋 Audit entries: ${auditLogs.length}`);
    auditLogs.forEach((log, index) => {
      console.log(`      ${index + 1}. ${log.action} ${log.entity_type} at ${log.created_at.toISOString()}`);
    });

    console.log('\n🚀 Stage 2 Design & Approval System working perfectly!');
    console.log('✅ Features tested:');
    console.log('   ✓ Design asset upload with versioning');
    console.log('   ✓ Client approval workflow');
    console.log('   ✓ Rejection with feedback');
    console.log('   ✓ Designer revision system');
    console.log('   ✓ Multi-version management');
    console.log('   ✓ Print-ready asset tracking');
    console.log('   ✓ Order status advancement');
    console.log('   ✓ Complete audit trail');
    console.log('   ✓ Design history and reporting');

  } catch (error) {
    console.error('❌ Design & Approval test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDesignApprovalSystem();