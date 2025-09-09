const fs = require('fs');
const path = require('path');

function fixAllImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Look for pattern where we have a line ending with } from '...'
      // followed by a line that starts with capital letters (broken import)
      if (line && line.includes("} from '") && 
          nextLine && nextLine.trim().match(/^[A-Z][a-zA-Z0-9,\s]+/)) {
        
        // Insert "import {" at the beginning of the next line
        const indent = nextLine.match(/^\s*/)[0];
        lines[i + 1] = `${indent}import {\n${nextLine}`;
        
        console.log(`Fixed import in ${filePath} at line ${i + 2}`);
        modified = true;
        break; // Only fix the first occurrence to avoid issues
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  let totalFixed = 0;
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      totalFixed += processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      if (fixAllImports(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

console.log('Fixing all remaining import syntax errors...');
const srcPath = path.join(__dirname, 'src');
let totalFixed = processDirectory(srcPath);

// Run multiple passes to catch all issues
let passes = 0;
while (totalFixed > 0 && passes < 3) {
  passes++;
  console.log(`\nPass ${passes} completed. Running another pass...`);
  totalFixed = processDirectory(srcPath);
}

console.log(`\nCompleted ${passes} passes. All import fixes applied.`);