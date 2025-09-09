const fs = require('fs');
const path = require('path');

function fixSessionImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace any 'next-auth' import with 'next-auth/next'
    const nextAuthRegex = /import\s+{\s*getServerSession\s*}\s+from\s+['"](next-auth)['"];?/g;
    if (content.match(nextAuthRegex)) {
      content = content.replace(nextAuthRegex, "import { getServerSession } from 'next-auth/next';");
      modified = true;
    }
    
    // Find and remove duplicate getServerSession imports
    const lines = content.split('\n');
    const newLines = [];
    let foundSessionImport = false;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('import { getServerSession }')) {
        if (!foundSessionImport) {
          // Keep the first getServerSession import, preferring next-auth/next
          if (line.includes('next-auth/next')) {
            newLines.push(line);
            foundSessionImport = true;
          } else {
            // Convert to next-auth/next
            const fixedLine = line.replace('next-auth', 'next-auth/next');
            newLines.push(fixedLine);
            foundSessionImport = true;
          }
          modified = true;
        } else {
          // Skip duplicate imports
          console.log(`Removing duplicate getServerSession import in ${filePath}: ${trimmedLine}`);
          modified = true;
        }
      } else {
        newLines.push(line);
      }
    }
    
    if (modified) {
      const newContent = newLines.join('\n');
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed session imports in: ${filePath}`);
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
      if (fixSessionImports(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

console.log('Fixing getServerSession imports...');
const srcPath = path.join(__dirname, 'src');
const totalFixed = processDirectory(srcPath);
console.log(`Fixed ${totalFixed} files with session import issues.`);