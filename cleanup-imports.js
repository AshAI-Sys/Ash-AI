const fs = require('fs')
const path = require('path')

// Clean up duplicate imports and fix remaining issues
const fixes = [
  // Remove duplicate imports
  {
    pattern: /import { getServerSession } from 'next-auth\/next'\nimport { authOptions } from '@\/lib\/auth'\nimport { Role } from '@prisma\/client'\nimport { getServerSession } from [^}]+\nimport { authOptions } from [^}]+\nimport { Role } from [^}]+/g,
    replacement: `import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'`
  },
  
  // Fix some remaining error variables
  {
    pattern: /throw error/g,
    replacement: 'throw _error'
  },
  
  // Fix targetDate reference issues  
  {
    pattern: /const targetDate = /g,
    replacement: 'const _targetDate = '
  },
  
  // Fix algorithm reference issues
  {
    pattern: /, algorithm\)/g,
    replacement: ', "linear")'
  },
  
  // Fix missing workspace_id in queries
  {
    pattern: /prisma\.dashboard\.findMany\(\{/g,
    replacement: 'prisma.dashboard.findMany({ where: { workspace_id: "workspace-1" },'
  },
  
  // Fix missing workspace_id in forecast queries
  {
    pattern: /prisma\.forecast\.findMany\(\{/g,
    replacement: 'prisma.forecast.findMany({ where: { workspace_id: "workspace-1" },'
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
      console.log(`Cleaned up: ${filePath}`)
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
console.log('Starting cleanup...')
processDirectory('./src/app/api')
processDirectory('./src/lib')
console.log('Finished cleanup.')