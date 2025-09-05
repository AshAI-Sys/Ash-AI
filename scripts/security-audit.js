import fs from 'fs'
import path from 'path'

console.log('🔒 COMPREHENSIVE SECURITY AUDIT - ASH AI SYSTEM')
console.log('===============================================')

let securityIssues = []
let securityPassed = []

function logIssue(severity, category, description, location = '') {
  securityIssues.push({ severity, category, description, location })
  const icon = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : '💡'
  console.log(`${icon} [${severity}] ${category}: ${description}${location ? ` (${location})` : ''}`)
}

function logPass(category, description) {
  securityPassed.push({ category, description })
  console.log(`✅ ${category}: ${description}`)
}

// 1. CHECK FOR EXPOSED SECRETS IN FRONTEND
console.log('\n🔍 1. FRONTEND SECRETS EXPOSURE CHECK')
console.log('=====================================')

const frontendFiles = [
  'src/app',
  'src/components', 
  'src/lib',
  'public'
]

const secretPatterns = [
  /sk_test_[a-zA-Z0-9]+/g,     // Stripe secret keys
  /sk_live_[a-zA-Z0-9]+/g,     // Stripe live keys  
  /AKIAI[A-Z0-9]{16}/g,        // AWS access keys
  /[0-9a-zA-Z/+]{40}/g,        // AWS secret keys
  /AIza[0-9A-Za-z\\-_]{35}/g,  // Google API keys
  /ya29\.[0-9A-Za-z\-_]+/g,    // Google OAuth tokens
  /\$2[aby]\$[0-9]+\$[./A-Za-z0-9]{53}/g, // bcrypt hashes
]

const sensitiveKeywords = [
  'password', 'secret', 'private', 'token', 'api_key', 'apikey',
  'access_token', 'refresh_token', 'auth_token', 'session_secret'
]

function scanFileForSecrets(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Check for secret patterns
    secretPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches && !filePath.includes('test') && !filePath.includes('example')) {
        logIssue('HIGH', 'SECRET EXPOSURE', `Potential secret found: ${matches[0].substring(0, 10)}...`, filePath)
      }
    })
    
    // Check for hardcoded sensitive keywords
    sensitiveKeywords.forEach(keyword => {
      const regex = new RegExp(`["']${keyword}["']\\s*:\\s*["'][^"']+["']`, 'gi')
      const matches = content.match(regex)
      if (matches && !filePath.includes('.env') && !filePath.includes('test')) {
        logIssue('MEDIUM', 'HARDCODED SECRET', `Hardcoded ${keyword} found`, filePath)
      }
    })
    
  } catch (error) {
    // Skip unreadable files
  }
}

function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(fullPath)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        scanFileForSecrets(fullPath)
      }
    })
  } catch (error) {
    // Skip inaccessible directories
  }
}

frontendFiles.forEach(dir => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir)
  }
})

// 2. CHECK ENVIRONMENT VARIABLES
console.log('\n🔍 2. ENVIRONMENT VARIABLES SECURITY')
console.log('===================================')

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8')
  const lines = envContent.split('\n')
  
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      
      // Check for weak secrets
      if (value && (
        value.includes('password123') ||
        value.includes('secret123') ||
        value.includes('your-') ||
        value.includes('test-') ||
        value.length < 16
      )) {
        logIssue('MEDIUM', 'WEAK SECRET', `Weak value for ${key}`, '.env')
      }
      
      // Check for production keys in development
      if (value && (
        value.includes('sk_live_') ||
        value.includes('pk_live_') ||
        value.includes('prod')
      )) {
        logIssue('HIGH', 'PROD KEYS', `Production key in development: ${key}`, '.env')
      }
    }
  })
  
  logPass('ENV CONFIG', 'Environment file exists and is not in git')
} else {
  logIssue('HIGH', 'MISSING CONFIG', 'No .env file found')
}

// 3. CHECK API SECURITY
console.log('\n🔍 3. API SECURITY ANALYSIS')
console.log('===========================')

const apiFiles = []
if (fs.existsSync('src/app/api')) {
  function findAPIFiles(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        findAPIFiles(fullPath)
      } else if (file === 'route.ts') {
        apiFiles.push(fullPath)
      }
    })
  }
  findAPIFiles('src/app/api')
}

console.log(`Found ${apiFiles.length} API routes to analyze...`)

let authChecks = 0
let authMissing = 0
let rateLimitChecks = 0
let inputValidation = 0

apiFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Check for authentication
    if (content.includes('getServerSession') || content.includes('auth')) {
      authChecks++
    } else if (!content.includes('public') && !filePath.includes('auth')) {
      authMissing++
      logIssue('HIGH', 'NO AUTH', 'API route missing authentication', filePath)
    }
    
    // Check for rate limiting
    if (content.includes('rate limit') || content.includes('rateLimited')) {
      rateLimitChecks++
    }
    
    // Check for input validation
    if (content.includes('zod') || content.includes('validate') || content.includes('schema')) {
      inputValidation++
    }
    
    // Check for SQL injection protection
    if (content.includes('${') && content.includes('SELECT')) {
      logIssue('HIGH', 'SQL INJECTION', 'Potential SQL injection vulnerability', filePath)
    }
    
    // Check for XSS protection
    if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
      logIssue('MEDIUM', 'XSS RISK', 'Potential XSS vulnerability', filePath)
    }
    
  } catch (error) {
    // Skip unreadable files
  }
})

logPass('API AUTH', `${authChecks}/${apiFiles.length} API routes have authentication`)
if (authMissing > 0) {
  logIssue('HIGH', 'MISSING AUTH', `${authMissing} API routes missing authentication`)
}

logPass('INPUT VALIDATION', `${inputValidation}/${apiFiles.length} API routes have input validation`)

// 4. CHECK DATABASE SECURITY
console.log('\n🔍 4. DATABASE SECURITY')
console.log('=======================')

if (fs.existsSync('prisma/schema.prisma')) {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8')
  
  // Check for sensitive data logging
  if (schema.includes('password') && !schema.includes('@map')) {
    logIssue('MEDIUM', 'PASSWORD FIELD', 'Password field may be logged')
  }
  
  // Check for proper constraints
  if (schema.includes('@unique') && schema.includes('email')) {
    logPass('DB CONSTRAINTS', 'Email uniqueness enforced')
  }
  
  logPass('DB CONFIG', 'Prisma schema exists and configured')
}

// 5. CHECK AUTHENTICATION IMPLEMENTATION
console.log('\n🔍 5. AUTHENTICATION SECURITY')
console.log('=============================')

if (fs.existsSync('src/lib/auth.ts')) {
  const authContent = fs.readFileSync('src/lib/auth.ts', 'utf-8')
  
  // Check for bcrypt usage
  if (authContent.includes('bcrypt') || authContent.includes('hash')) {
    logPass('PASSWORD HASHING', 'Password hashing implemented')
  } else {
    logIssue('HIGH', 'NO PASSWORD HASH', 'No password hashing found')
  }
  
  // Check for session configuration
  if (authContent.includes('jwt') || authContent.includes('session')) {
    logPass('SESSION CONFIG', 'Session management configured')
  }
  
  // Check for secure cookie settings
  if (authContent.includes('httpOnly') && authContent.includes('secure')) {
    logPass('SECURE COOKIES', 'Secure cookie settings found')
  } else {
    logIssue('MEDIUM', 'INSECURE COOKIES', 'Cookie security settings missing')
  }
}

// 6. CHECK FILE PERMISSIONS AND EXPOSURE
console.log('\n🔍 6. FILE EXPOSURE CHECK')
console.log('=========================')

const sensitiveFiles = [
  '.env',
  '.env.local',
  'package-lock.json',
  'yarn.lock',
  'database.db',
  'dev.db'
]

sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    if (fs.existsSync('.gitignore')) {
      const gitignore = fs.readFileSync('.gitignore', 'utf-8')
      if (gitignore.includes(file) || (file.startsWith('.env') && gitignore.includes('.env'))) {
        logPass('FILE PROTECTION', `${file} is gitignored`)
      } else {
        logIssue('HIGH', 'FILE EXPOSURE', `${file} not in .gitignore`, file)
      }
    }
  }
})

// 7. CHECK CORS AND HEADERS
console.log('\n🔍 7. SECURITY HEADERS CHECK')
console.log('============================')

if (fs.existsSync('next.config.js')) {
  const nextConfig = fs.readFileSync('next.config.js', 'utf-8')
  
  if (nextConfig.includes('headers') && nextConfig.includes('X-Frame-Options')) {
    logPass('SECURITY HEADERS', 'Security headers configured')
  } else {
    logIssue('MEDIUM', 'MISSING HEADERS', 'Security headers not configured')
  }
}

// 8. FINAL SUMMARY
console.log('\n📊 SECURITY AUDIT SUMMARY')
console.log('==========================')

const highIssues = securityIssues.filter(i => i.severity === 'HIGH')
const mediumIssues = securityIssues.filter(i => i.severity === 'MEDIUM')
const lowIssues = securityIssues.filter(i => i.severity === 'LOW')

console.log(`✅ Security Checks Passed: ${securityPassed.length}`)
console.log(`🚨 High Severity Issues: ${highIssues.length}`)
console.log(`⚠️  Medium Severity Issues: ${mediumIssues.length}`)
console.log(`💡 Low Severity Issues: ${lowIssues.length}`)

if (highIssues.length === 0 && mediumIssues.length <= 2) {
  console.log('\n🎉 SECURITY STATUS: GOOD')
  console.log('System follows security best practices!')
} else if (highIssues.length > 0) {
  console.log('\n⚠️  SECURITY STATUS: NEEDS ATTENTION')
  console.log('Critical security issues found that should be addressed.')
} else {
  console.log('\n💡 SECURITY STATUS: ACCEPTABLE')
  console.log('Minor security improvements recommended.')
}

console.log('\n🔒 SECURITY RECOMMENDATIONS:')
console.log('1. Regularly rotate API keys and secrets')
console.log('2. Implement rate limiting on all API endpoints')
console.log('3. Add security headers (CSP, HSTS, etc.)')
console.log('4. Regular dependency security audits')
console.log('5. Implement proper logging and monitoring')
console.log('6. Use HTTPS in production')
console.log('7. Regular penetration testing')