#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Analyzing bundle size...\n');

try {
  // Build the project first
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Run bundle analyzer
  console.log('\nRunning bundle analysis...');
  process.env.ANALYZE = 'true';
  execSync('npm run build', { stdio: 'inherit' });

  // Read build manifest
  const manifestPath = path.join(process.cwd(), '.next', 'build-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('\n📊 Bundle Analysis Results:');
    console.log('================================');
    
    // Analyze pages
    if (manifest.pages) {
      console.log('\n📄 Pages:');
      Object.entries(manifest.pages).forEach(([page, files]) => {
        const totalSize = files.reduce((sum, file) => {
          const filePath = path.join(process.cwd(), '.next', file);
          if (fs.existsSync(filePath)) {
            return sum + fs.statSync(filePath).size;
          }
          return sum;
        }, 0);
        
        console.log(`  ${page}: ${(totalSize / 1024).toFixed(2)} KB (${files.length} files)`);
      });
    }

    // Analyze app chunks
    if (manifest.rootMainFiles) {
      console.log('\n🧩 Main Chunks:');
      manifest.rootMainFiles.forEach(file => {
        const filePath = path.join(process.cwd(), '.next', file);
        if (fs.existsSync(filePath)) {
          const size = fs.statSync(filePath).size;
          console.log(`  ${file}: ${(size / 1024).toFixed(2)} KB`);
        }
      });
    }
  }

  // Analyze .next/static directory
  const staticDir = path.join(process.cwd(), '.next', 'static');
  if (fs.existsSync(staticDir)) {
    console.log('\n📦 Static Assets:');
    
    const analyzeDirectory = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          analyzeDirectory(itemPath, `${prefix}${item}/`);
        } else {
          const size = stat.size;
          if (size > 10 * 1024) { // Show files larger than 10KB
            console.log(`  ${prefix}${item}: ${(size / 1024).toFixed(2)} KB`);
          }
        }
      });
    };
    
    analyzeDirectory(staticDir);
  }

  // Generate recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('================================');
  console.log('• Enable compression in production');
  console.log('• Use dynamic imports for large components');
  console.log('• Optimize images with next/image');
  console.log('• Remove unused dependencies');
  console.log('• Consider code splitting for large pages');
  console.log('• Use tree shaking for libraries');

} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Bundle analysis complete!');
console.log('Check the generated report in your browser for detailed analysis.');

export {};