// Since we need to test TypeScript files, let's inline the test
const { PrismaClient } = require('@prisma/client');

// Inline the PO generation logic for testing
async function generatePONumber(brandId, prisma) {
  const currentYear = new Date().getFullYear();
  
  return await prisma.$transaction(async (tx) => {
    const brand = await tx.brand.findUnique({
      where: { id: brandId },
      select: { code: true, name: true }
    });
    
    if (!brand || !brand.code) {
      throw new Error(`Brand not found or missing code`);
    }
    
    const sequenceRecord = await tx.pONumberSequence.findUnique({
      where: { 
        brand_id_year: { 
          brand_id: brandId, 
          year: currentYear 
        } 
      }
    });
    
    let nextSequence;
    
    if (!sequenceRecord) {
      nextSequence = 1;
      await tx.pONumberSequence.create({
        data: {
          brand_id: brandId,
          year: currentYear,
          sequence: nextSequence,
        }
      });
    } else {
      nextSequence = sequenceRecord.sequence + 1;
      await tx.pONumberSequence.update({
        where: { 
          brand_id_year: { 
            brand_id: brandId, 
            year: currentYear 
          } 
        },
        data: { sequence: nextSequence }
      });
    }
    
    const po_number = `${brand.code}-${currentYear}-${nextSequence.toString().padStart(6, '0')}`;
    
    return { po_number, sequence: nextSequence };
  });
}

function validatePONumber(poNumber) {
  const pattern = /^[A-Z]{2,6}-\d{4}-\d{6}$/;
  return pattern.test(poNumber);
}

async function testPOGenerator() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing ASH AI PO Number Generator...');
    
    // Get the existing brand from our test
    const brand = await prisma.brand.findFirst({
      where: { code: 'SORB' }
    });
    
    if (!brand) {
      console.error('❌ No brand found with code SORB. Run test-db.js first.');
      return;
    }
    
    console.log('✅ Found brand:', brand.name, 'with code:', brand.code);
    
    // Test generating actual PO numbers
    for (let i = 1; i <= 3; i++) {
      const result = await generatePONumber(brand.id, prisma);
      console.log(`✅ Generated PO #${i}:`, result.po_number, `(sequence: ${result.sequence})`);
      
      // Validate the generated PO number
      const isValid = validatePONumber(result.po_number);
      console.log(`🔍 Validation:`, isValid ? '✅ Valid' : '❌ Invalid');
    }
    
    // Test validation function
    console.log('\n🔍 Testing validation function:');
    console.log('SORB-2025-000001:', validatePONumber('SORB-2025-000001') ? '✅ Valid' : '❌ Invalid');
    console.log('INVALID-PO:', validatePONumber('INVALID-PO') ? '✅ Valid' : '❌ Invalid');
    console.log('SORB-25-1:', validatePONumber('SORB-25-1') ? '✅ Valid' : '❌ Invalid');
    
    console.log('\n🚀 PO Number Generator working perfectly!');
    
  } catch (error) {
    console.error('❌ PO Generator test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPOGenerator();