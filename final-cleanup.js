const fs = require('fs');
const path = require('path');

function finalCleanup(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cleanLines = [];
    const importSeen = new Set();
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // If it's an import line, check for duplicates
      if (trimmedLine.startsWith('import ')) {
        // Normalize the import for comparison
        const normalizedImport = trimmedLine
          .replace(/'/g, '"')  // Normalize quotes
          .replace(/;$/, '');  // Remove trailing semicolon
        
        if (!importSeen.has(normalizedImport)) {
          importSeen.add(normalizedImport);
          cleanLines.push(line);
        } else {
          console.log(`Removing duplicate in ${filePath}: ${trimmedLine}`);
        }
      } else {
        cleanLines.push(line);
      }
    }
    
    const newContent = cleanLines.join('\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Cleaned: ${filePath}`);
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
      if (finalCleanup(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

console.log('Final cleanup of duplicate imports...');
const srcPath = path.join(__dirname, 'src');
const totalFixed = processDirectory(srcPath);
console.log(`Final cleanup fixed ${totalFixed} files.`);