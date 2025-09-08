const fs = require('fs');
const path = require('path');

function findFiles(dir, extension) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
        results = results.concat(findFiles(fullPath, extension));
      }
    } else if (file.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function fixDateSyntax(content) {
  // Fix patterns like "object.(new Date(field).getTime()"
  content = content.replace(/(\w+)\.\(new Date\((\w+)\)\.getTime\(\)/g, 'new Date($1.$2).getTime()');
  
  // Fix patterns like "object.(new Date(object.field).getTime()"
  content = content.replace(/(\w+)\.\(new Date\((\w+)\.(\w+)\)\.getTime\(\)/g, 'new Date($1.$2.$3).getTime()');
  
  // Fix patterns like "(new Date(field).getTime() - object.(new Date(field2).getTime()"
  content = content.replace(/\(new Date\((\w+)\)\.getTime\(\) - (\w+)\.\(new Date\((\w+)\)\.getTime\(\)/g, '(new Date($1).getTime() - new Date($2.$3).getTime()');
  
  // Fix other malformed patterns
  content = content.replace(/(\w+)\.\(new Date\(/g, 'new Date($1.');
  content = content.replace(/\.\(new Date\(/g, '. new Date(');
  
  return content;
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
    const fixedContent = fixDateSyntax(content);
    
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