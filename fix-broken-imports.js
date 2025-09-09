const fs = require('fs');
const path = require('path');

// List of files that we know have broken imports
const brokenFiles = [
  'src/components/ai/AshleyAIChat.tsx',
  'src/components/ai/PredictiveAnalytics.tsx',
  'src/components/analytics/InteractiveCharts.tsx',
  'src/components/ash/RoutingTemplateBuilder.tsx',
  'src/components/design/DesignUploadModal.tsx'
];

function fixBrokenImport(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Look for lines that start with } from and have a missing import { above
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('} from ') && i > 0) {
        // Check if previous lines are import items but missing "import {"
        let j = i - 1;
        let importItems = [];
        
        while (j >= 0 && (lines[j].trim().endsWith(',') || lines[j].includes('}'))) {
          const trimmed = lines[j].trim();
          if (trimmed && !trimmed.startsWith('import') && !trimmed.startsWith('//')) {
            importItems.unshift(lines[j]);
          }
          j--;
        }
        
        // Check if the line before import items doesn't have "import {"
        if (importItems.length > 0 && !lines[j+1].includes('import {')) {
          // We found a broken import, fix it
          const indent = lines[j+1].match(/^\s*/)[0];
          lines[j+1] = `${indent}import {\n${lines[j+1]}`;
          
          fs.writeFileSync(fullPath, lines.join('\n'));
          console.log(`Fixed broken import in: ${filePath}`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Fixing broken import statements...');

for (const file of brokenFiles) {
  fixBrokenImport(file);
}

console.log('Done fixing broken imports.');