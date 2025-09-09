const fs = require('fs');
const path = require('path');

function fixImportSyntax(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix broken import statements that start with just DropdownMenu, etc. without "import {"
    const brokenImportRegex = /^(\s*)(DropdownMenu|Users|AreaChart|Download|TrendingUp),$/gm;
    
    content = content.replace(brokenImportRegex, (match, whitespace, firstItem) => {
      console.log(`Fixing broken import in ${filePath}: ${match.trim()}`);
      modified = true;
      return `${whitespace}import {\n${whitespace}  ${firstItem},`;
    });
    
    // Fix broken import lines that end with "}\" but should be "} from"
    content = content.replace(/^(\s*)}\s+from\s+/gm, (match, whitespace) => {
      return `${whitespace}} from `;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed import syntax in: ${filePath}`);
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
      if (fixImportSyntax(fullPath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

console.log('Fixing import syntax errors...');
const srcPath = path.join(__dirname, 'src', 'components');
const totalFixed = processDirectory(srcPath);
console.log(`Fixed import syntax in ${totalFixed} files.`);