const fs = require('fs')
const path = require('path')

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let lines = content.split('\n')
    let changed = false
    
    // Track imports we've seen
    const seenImports = new Set()
    const filteredLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this is an import line
      if (line.trim().startsWith('import ') && line.includes(' from ')) {
        const importKey = line.trim()
        
        if (seenImports.has(importKey)) {
          // Skip duplicate import
          changed = true
          continue
        } else {
          seenImports.add(importKey)
        }
      }
      
      filteredLines.push(line)
    }
    
    if (changed) {
      const newContent = filteredLines.join('\n')
      fs.writeFileSync(filePath, newContent)
      console.log(`Removed duplicate imports from: ${filePath}`)
    }
    
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message)
  }
}

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
console.log('Removing duplicate imports...')
processDirectory('./src')
console.log('Finished removing duplicate imports.')