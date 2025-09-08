const fs = require('fs');
const path = require('path');

function findFiles(dir, extension) {
  let results = [];
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
            results = results.concat(findFiles(fullPath, extension));
          }
        } else if (file.endsWith(extension)) {
          results.push(fullPath);
        }
      } catch (e) {
        // Skip files we can't read
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  
  return results;
}

function fixAllSyntax(content) {
  // Fix all variations of malformed Date syntax
  let fixed = content;
  
  // Pattern: object.new Date(field).getTime() -> new Date(object.field).getTime()
  fixed = fixed.replace(/(\w+)\.new Date\((\w+)\)\.getTime\(\)/g, 'new Date($1.$2).getTime()');
  
  // Pattern: data.new Date(targetDeliveryDate) -> new Date(data.targetDeliveryDate)
  fixed = fixed.replace(/(\w+)\.new Date\((\w+)\)/g, 'new Date($1.$2)');
  
  // Pattern: ...order_history.map(o => o.new Date(created_at) -> ...order_history.map(o => new Date(o.created_at)
  fixed = fixed.replace(/(\w+) => \w+\.new Date\((\w+)\)/g, '$1 => new Date($1.$2)');
  
  // Pattern: params.new Date(targetDate) -> new Date(params.targetDate)
  fixed = fixed.replace(/params\.new Date\((\w+)\)/g, 'new Date(params.$1)');
  
  // Pattern: session.new Date(field) -> new Date(session.field)
  fixed = fixed.replace(/session\.new Date\((\w+)\)/g, 'new Date(session.$1)');
  
  // Pattern: order.new Date(deadline) -> new Date(order.deadline)
  fixed = fixed.replace(/(\w+)\.new Date\((\w+)\)/g, 'new Date($1.$2)');
  
  // Fix any remaining .new Date patterns
  fixed = fixed.replace(/\.new Date\(/g, ', new Date(');
  
  // Fix regex literal issues by removing problematic regex
  fixed = fixed.replace(/\/ \(1000 \* 60 \* 60 \* 24\) \/\/g/g, '/ (1000 * 60 * 60 * 24)');
  fixed = fixed.replace(/\/ \(1000 \* 60\) \/\/g/g, '/ (1000 * 60)');
  
  return fixed;
}

// Find all TypeScript files
const tsFiles = [
  ...findFiles('./src', '.ts'),
  ...findFiles('./src', '.tsx')
];

console.log(`Found ${tsFiles.length} TypeScript files`);

let fixedFiles = 0;

for (const filePath of tsFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixAllSyntax(content);
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`Fixed: ${filePath}`);
      fixedFiles++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`Fixed ${fixedFiles} files`);