/**
 * ASH AI - Professional PO Number Generation System
 * Generates unique PO numbers in BRAND-YYYY-NNNNNN format
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface POGenerationResult {
  poNumber: string
  sequence: number
  brandCode: string
  year: number
}

/**
 * Generate next PO number for a brand in the current year
 */
export async function generatePONumber(brandId: string): Promise<POGenerationResult> {
  const currentYear = new Date().getFullYear()
  
  // Get brand information
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { code: true }
  })

  if (!brand?.code) {
    throw new Error(`Brand not found or missing code: ${brandId}`)
  }

  // Use transaction to ensure atomic sequence generation
  const result = await prisma.$transaction(async (tx) => {
    // Get or create sequence record for this brand/year
    let sequenceRecord = await tx.pONumberSequence.findUnique({
      where: {
        brand_id_year: {
          brand_id: brandId,
          year: currentYear
        }
      }
    })

    if (!sequenceRecord) {
      // Create new sequence for this brand/year
      sequenceRecord = await tx.pONumberSequence.create({
        data: {
          brand_id: brandId,
          year: currentYear,
          sequence: 1
        }
      })
    } else {
      // Increment sequence
      sequenceRecord = await tx.pONumberSequence.update({
        where: { id: sequenceRecord.id },
        data: { sequence: { increment: 1 } }
      })
    }

    return sequenceRecord
  })

  // Format PO number: BRAND-YYYY-NNNNNN
  const paddedSequence = result.sequence.toString().padStart(6, '0')
  const poNumber = `${brand.code}-${currentYear}-${paddedSequence}`

  return {
    poNumber,
    sequence: result.sequence,
    brandCode: brand.code,
    year: currentYear
  }
}

/**
 * Validate PO number format
 */
export function validatePONumber(poNumber: string): boolean {
  const poRegex = /^[A-Z]+(-[0-9]{4}-[0-9]{6})$/
  return poRegex.test(poNumber)
}

/**
 * Parse PO number components
 */
export function parsePONumber(poNumber: string): {
  brandCode: string
  year: number
  sequence: number
} | null {
  if (!validatePONumber(poNumber)) {
    return null
  }

  const parts = poNumber.split('-')
  if (parts.length !== 3) {
    return null
  }

  return {
    brandCode: parts[0],
    year: parseInt(parts[1]),
    sequence: parseInt(parts[2])
  }
}

/**
 * Check if PO number already exists
 */
export async function isUniquePoNumber(poNumber: string): Promise<boolean> {
  const existing = await prisma.order.findUnique({
    where: { po_number: poNumber },
    select: { id: true }
  })
  
  return !existing
}