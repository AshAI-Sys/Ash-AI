const fs = require('fs');
const path = require('path');

function fixDuplicateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has duplicate Role imports
    if (content.includes("import { Role } from '@prisma/client'") && 
        content.includes("import { Role,")) {
      
      // Remove the standalone Role import
      content = content.replace(/import { Role } from '@prisma\/client'[\r\n]+/g, '');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix specific files mentioned in the error
const filesToFix = [
  'src/app/api/qc/route.ts',
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/tasks/route.ts'
];

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fixDuplicateImports(fullPath);
  }
});

console.log('Import fixing complete!');