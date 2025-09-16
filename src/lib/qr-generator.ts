// QR Code generation utility for bundle tracking
// Based on CLIENT_UPDATED_PLAN.md specifications

/**
 * Generate QR code for bundle tracking
 * Content format: ash://bundle/{bundle_id} or short URL to bundle viewer
 *
 * @param content The content to encode in QR code
 * @returns Promise<string> URL to generated QR code image
 */
export async function generateQRCode(content: string): Promise<string> {
  try {
    // For now, return a placeholder QR code URL
    // In production, this would integrate with QR code generation service
    const encodedContent = encodeURIComponent(content)

    // Using QR Server API as placeholder
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedContent}`

    return qrUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate bundle QR code with specific formatting
 * Includes: PO# • Size • Qty • Lay# • CreatedAt
 *
 * @param bundleData Bundle information for QR code
 * @returns Promise<string> URL to generated QR code
 */
export async function generateBundleQRCode(bundleData: {
  bundle_id: string
  po_number: string
  size: string
  qty: number
  lay_number?: string
  created_at: Date
}): Promise<string> {
  try {
    // Create content with bundle info
    const displayText = [
      bundleData.po_number,
      bundleData.size,
      `${bundleData.qty} pcs`,
      bundleData.lay_number ? `Lay ${bundleData.lay_number}` : '',
      bundleData.created_at.toLocaleDateString()
    ].filter(Boolean).join(' • ')

    // QR content is the bundle URL
    const qrContent = `ash://bundle/${bundleData.bundle_id}`

    // Generate QR code
    return await generateQRCode(qrContent)
  } catch (error) {
    console.error('Error generating bundle QR code:', error)
    throw new Error('Failed to generate bundle QR code')
  }
}

/**
 * Decode QR code content to extract bundle ID
 *
 * @param qrContent Raw QR code content
 * @returns string | null Bundle ID if valid format
 */
export function extractBundleIdFromQR(qrContent: string): string | null {
  try {
    // Check if content matches ash://bundle/{id} format
    const match = qrContent.match(/^ash:\/\/bundle\/(.+)$/)
    return match ? match[1] : null
  } catch (error) {
    console.error('Error extracting bundle ID:', error)
    return null
  }
}

/**
 * Validate QR code format for ASH AI system
 *
 * @param qrContent QR code content to validate
 * @returns boolean True if valid ASH AI QR format
 */
export function isValidAshQRCode(qrContent: string): boolean {
  try {
    // Valid formats:
    // - ash://bundle/{id}
    // - ash://order/{id}
    // - ash://machine/{id}
    const validPatterns = [
      /^ash:\/\/bundle\/.+$/,
      /^ash:\/\/order\/.+$/,
      /^ash:\/\/machine\/.+$/
    ]

    return validPatterns.some(pattern => pattern.test(qrContent))
  } catch (error) {
    console.error('Error validating QR code:', error)
    return false
  }
}

/**
 * Generate printable label template for bundle
 * Returns HTML template for 2×3" label as specified in CLIENT_UPDATED_PLAN
 *
 * @param bundleData Bundle information for label
 * @returns string HTML template for printing
 */
export function generateBundleLabelTemplate(bundleData: {
  bundle_no: string
  po_number: string
  size: string
  qty: number
  qr_code_url: string
  created_at: Date
}): string {
  return `
    <div style="
      width: 3in;
      height: 2in;
      border: 1px solid #000;
      padding: 8px;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      background: white;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 12px;">${bundleData.po_number}</div>
          <div style="font-size: 10px; margin: 2px 0;">Size: ${bundleData.size}</div>
          <div style="font-size: 10px; margin: 2px 0;">Qty: ${bundleData.qty} pcs</div>
          <div style="font-size: 8px; color: #666;">
            ${bundleData.created_at.toLocaleDateString()}
          </div>
        </div>
        <div style="margin-left: 8px;">
          <img src="${bundleData.qr_code_url}" alt="QR Code" style="width: 60px; height: 60px;" />
        </div>
      </div>
      <div style="margin-top: auto; font-size: 8px; text-align: center; color: #666;">
        Bundle: ${bundleData.bundle_no}
      </div>
    </div>
  `
}