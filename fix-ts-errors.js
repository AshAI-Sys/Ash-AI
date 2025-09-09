const fs = require('fs')
const path = require('path')

// Common error patterns and their fixes
const fixes = [
  // Error variable naming
  { 
    pattern: /console\.error\([^,]+, error\)/g, 
    replacement: (match) => match.replace(', error)', ', _error)')
  },
  { 
    pattern: /} catch \([^)]*\) {[^}]*console\.error\([^,]+, error\)/g,
    replacement: (match) => match.replace(', error)', ', _error)')
  },
  
  // Missing imports - add imports at the top
  {
    pattern: /import { NextRequest, NextResponse } from ['"](next\/server|next\/server)['"]/,
    replacement: `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'`
  },
  
  // Database field corrections
  {
    pattern: /createdBy:/g,
    replacement: 'created_by:'
  },
  {
    pattern: /updatedAt:/g,
    replacement: 'updated_at:'
  },
  {
    pattern: /createdAt:/g,
    replacement: 'created_at:'
  },
  
  // Enum value corrections
  {
    pattern: /'PENDING'/g,
    replacement: "'OPEN'"
  },
  
  // Remove non-existent fields
  {
    pattern: /creator:\s*true,?\s*/g,
    replacement: ''
  },
  {
    pattern: /layout:\s*[^,}]+,?\s*/g,
    replacement: ''
  },
  {
    pattern: /isDefault:\s*[^,}]+,?\s*/g,
    replacement: ''
  },
  {
    pattern: /name:\s*[^,}]+,?\s*type:/g,
    replacement: 'type:'
  },
  {
    pattern: /allowedRoles:\s*{[^}]+},?\s*/g,
    replacement: ''
  },
]

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let changed = false
    
    for (const fix of fixes) {
      const newContent = content.replace(fix.pattern, fix.replacement)
      if (newContent !== content) {
        content = newContent
        changed = true
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content)
      console.log(`Fixed: ${filePath}`)
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message)
  }
}

// Process all API route files
function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        processDirectory(fullPath)
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        processFile(fullPath)
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dirPath}:`, err.message)
  }
}

// Start processing
console.log('Starting TypeScript error fixes...')
processDirectory('./src/app/api')
processDirectory('./src/lib')
console.log('Finished processing files.')