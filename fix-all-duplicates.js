const fs = require('fs');
const path = require('path');

function cleanupImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const importLines = [];
    const otherLines = [];
    const seenImports = new Set();
    
    let inImportSection = true;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if we're still in the import section
      if (inImportSection && !trimmedLine.startsWith('import ') && !trimmedLine.startsWith('//') && trimmedLine !== '') {
        inImportSection = false;
      }
      
      if (inImportSection && trimmedLine.startsWith('import ')) {
        // Parse import statement
        const importKey = trimmedLine.replace(/;$/, ''); // Remove trailing semicolon for comparison
        
        if (!seenImports.has(importKey)) {
          seenImports.add(importKey);
          importLines.push(line);
        } else {
          console.log(`Removing duplicate import in ${filePath}: ${trimmedLine}`);
        }
      } else {
        otherLines.push(line);
      }
    }
    
    const newContent = [...importLines, ...otherLines].join('\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed imports in: ${filePath}`);
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
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      if (cleanupImports(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

console.log('Fixing duplicate imports in all TypeScript files...');
const srcPath = path.join(__dirname, 'src');
const totalFixed = processDirectory(srcPath);
console.log(`Fixed ${totalFixed} files with duplicate imports.`);