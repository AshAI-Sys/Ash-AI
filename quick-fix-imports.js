const fs = require('fs');
const path = require('path');

// Define files and their missing import lines
const fixes = [
  {
    file: 'src/components/ai/PredictiveAnalytics.tsx',
    find: "} from '@/components/ui/badge'\n  BarChart,",
    replace: "} from '@/components/ui/badge'\nimport {\n  BarChart,"
  },
  {
    file: 'src/components/analytics/InteractiveCharts.tsx', 
    find: "} from 'recharts'\n  TrendingUp,",
    replace: "} from 'recharts'\nimport {\n  TrendingUp,"
  },
  {
    file: 'src/components/ash/RoutingTemplateBuilder.tsx',
    find: "} from '@/components/ui/popover'\n  Clock,",
    replace: "} from '@/components/ui/popover'\nimport {\n  Clock,"
  },
  {
    file: 'src/components/design/DesignUploadModal.tsx',
    find: "} from '@/components/ui/textarea'\n  Upload,",
    replace: "} from '@/components/ui/textarea'\nimport {\n  Upload,"
  }
];

fixes.forEach(fix => {
  try {
    const filePath = path.join(__dirname, fix.file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.find)) {
      content = content.replace(fix.find, fix.replace);
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${fix.file}`);
    } else {
      console.log(`Pattern not found in: ${fix.file}`);
      
      // Alternative approach - look for any case where we have a line ending with } from '...' 
      // followed by a line starting with capital letters (likely the start of broken import)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes("} from '") && 
            lines[i+1].trim().match(/^[A-Z][a-zA-Z,\s]+$/)) {
          lines[i+1] = 'import {\n  ' + lines[i+1];
          const newContent = lines.join('\n');
          fs.writeFileSync(filePath, newContent);
          console.log(`Fixed with alternative approach: ${fix.file}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error(`Error fixing ${fix.file}:`, error.message);
  }
});

console.log('Import fixes completed.');