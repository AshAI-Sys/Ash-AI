// @ts-nocheck
import { db } from './db';
// PO Number Generation Utility
// Based on CLIENT_UPDATED_PLAN.md: PO = {BRANDCODE}-{YYYY}-{zero-pad seq}
// Sequence is per brand per year (safe via DB transaction)


export interface PONumberResult {
  po_number: string;
  sequence: number;
}

/**
 * Generates the next PO number for a brand following the format:
 * BRANDCODE-YYYY-NNNNNN (e.g., REEF-2025-000123)
 */
export async function generatePONumber(brand_id: string): Promise<PONumberResult> {
  const currentYear = new Date().getFullYear();
  
  return await db.$transaction(async (tx) => {
    // Get the brand to get its code
    const brand = await tx.brand.findUnique({
      where: { id: brand_id },
      select: { code: true, name: true }
    });
    
    if (!brand) {
      throw new Error(`Brand with ID ${brand_id} not found`);
    }
    
    if (!brand.code) {
      throw new Error(`Brand ${brand.name} does not have a code set`);
    }
    
    // Get or create the sequence record for this brand and year
    const sequenceRecord = await tx.$queryRaw<Array<{ sequence: number }>>`
      SELECT sequence FROM po_number_sequences 
      WHERE brand_id = ${brand_id} AND year = ${currentYear}
    `;
    
    let nextSequence: number;
    
    if (sequenceRecord.length === 0) {
      // First PO for this brand/year combination
      nextSequence = 1;
      await tx.$executeRaw`
        INSERT INTO po_number_sequences (id, brand_id, year, sequence, created_at, updated_at)
        VALUES (${generateId()}, ${brand_id}, ${currentYear}, ${nextSequence}, ${new Date().toISOString()}, ${new Date().toISOString()})
      `;
    } else {
      // Increment the existing sequence
      nextSequence = sequenceRecord[0].sequence + 1;
      await tx.$executeRaw`
        UPDATE po_number_sequences 
        SET sequence = ${nextSequence}, updated_at = ${new Date().toISOString()}
        WHERE brand_id = ${brand_id} AND year = ${currentYear}
      `;
    }
    
    // Format the PO number: BRANDCODE-YYYY-NNNNNN
    const po_number = `${brand.code}-${currentYear}-${nextSequence.toString().padStart(6, '0')}`;
    
    return {
      po_number,
      sequence: nextSequence
    };
  });
}

/**
 * Validates if a PO number follows the correct format
 */
export function validatePONumber(po_number: string): boolean {
  // Pattern: BRANDCODE-YYYY-NNNNNN
  const pattern = /^[A-Z]{2,6}-\d{4}-\d{6}$/;
  return pattern.test(poNumber);
}

/**
 * Parses a PO number to extract its components
 */
export function parsePONumber(po_number: string): {
  brandCode: string;
  year: number;
  sequence: number;
} | null {
  if (!validatePONumber(poNumber)) {
    return null;
  }
  
  const parts = poNumber.split('-');
  return {
    brandCode: parts[0],
    year: parseInt(parts[1]),
    sequence: parseInt(parts[2])
  };
}

/**
 * Checks if a PO number already exists in the database
 */
export async function isPONumberExists(po_number: string): Promise<boolean> {
  const count = await db.order.count({
    where: {
      po_number: poNumber
    }
  });
  
  return count > 0;
}

/**
 * Generate a UUID for database records
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get the next available PO number for a brand (preview without saving)
 */
export async function previewNextPONumber(brand_id: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  
  const brand = await db.brand.findUnique({
    where: { id: brand_id },
    select: { code: true, name: true }
  });
  
  if (!brand) {
    throw new Error(`Brand with ID ${brand_id} not found`);
  }
  
  if (!brand.code) {
    throw new Error(`Brand ${brand.name} does not have a code set`);
  }
  
  // Get current sequence
  const sequenceRecord = await db.$queryRaw<Array<{ sequence: number }>>`
    SELECT sequence FROM po_number_sequences 
    WHERE brand_id = ${brand_id} AND year = ${currentYear}
  `;
  
  const nextSequence = sequenceRecord.length === 0 ? 1 : sequenceRecord[0].sequence + 1;
  
  return `${brand.code}-${currentYear}-${nextSequence.toString().padStart(6, '0')}`;
}