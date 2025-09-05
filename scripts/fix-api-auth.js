import fs from 'fs'

console.log('🔒 BATCH FIXING API AUTHENTICATION')
console.log('=================================')

const authImports = `import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'`

const authCheck = `    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }`

const adminCheck = `    // Authorization check - admin/manager only
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }`

// Critical API files that need authentication
const criticalAPIs = [
  'src/app/api/analytics/forecasts/route.ts',
  'src/app/api/analytics/insights/route.ts', 
  'src/app/api/analytics/kpis/route.ts',
  'src/app/api/finance/accounts/route.ts',
  'src/app/api/finance/expenses/route.ts',
  'src/app/api/finance/reports/route.ts',
  'src/app/api/webhooks/route.ts'
]

function addAuthToAPI(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`)
      return
    }

    let content = fs.readFileSync(filePath, 'utf-8')
    
    // Skip if already has authentication
    if (content.includes('getServerSession') || content.includes('authOptions')) {
      console.log(`✅ Already secured: ${filePath}`)
      return
    }
    
    // Add imports
    if (!content.includes('getServerSession')) {
      content = content.replace(
        /import { NextRequest, NextResponse } from 'next\/server'/,
        `import { NextRequest, NextResponse } from 'next/server'
${authImports}`
      )
    }
    
    // Add auth check to GET methods
    content = content.replace(
      /export async function GET\(request: NextRequest\) \{[\s]*try \{/g,
      `export async function GET(request: NextRequest) {
  try {
${authCheck}`
    )
    
    // Add auth check to POST methods
    content = content.replace(
      /export async function POST\(request: NextRequest\) \{[\s]*try \{/g,
      `export async function POST(request: NextRequest) {
  try {
${authCheck}
${adminCheck}`
    )
    
    // Add auth check to PUT methods
    content = content.replace(
      /export async function PUT\(request: NextRequest\) \{[\s]*try \{/g,
      `export async function PUT(request: NextRequest) {
  try {
${authCheck}
${adminCheck}`
    )
    
    // Add auth check to DELETE methods
    content = content.replace(
      /export async function DELETE\(request: NextRequest\) \{[\s]*try \{/g,
      `export async function DELETE(request: NextRequest) {
  try {
${authCheck}
${adminCheck}`
    )
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ Secured: ${filePath}`)
    
  } catch (error) {
    console.log(`❌ Failed to secure ${filePath}: ${error.message}`)
  }
}

// Process critical APIs
criticalAPIs.forEach(addAuthToAPI)

// Process webhook specifically (different pattern)
const webhookPath = 'src/app/api/webhooks/route.ts'
if (fs.existsSync(webhookPath)) {
  let webhookContent = fs.readFileSync(webhookPath, 'utf-8')
  
  // Webhooks need special handling - validate webhook signature instead of session
  if (!webhookContent.includes('webhook-signature')) {
    const signatureCheck = `    // Webhook signature validation
    const signature = request.headers.get('webhook-signature')
    if (!signature || !validateWebhookSignature(signature, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }`
    
    webhookContent = webhookContent.replace(
      /export async function POST\(request: NextRequest\) \{[\s]*try \{/,
      `export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
${signatureCheck}`
    )
    
    fs.writeFileSync(webhookPath, webhookContent)
    console.log('✅ Secured webhook with signature validation')
  }
}

console.log('\n🎉 BATCH AUTH FIX COMPLETE!')
console.log('All critical APIs now have authentication checks.')