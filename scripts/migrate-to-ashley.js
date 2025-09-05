#!/usr/bin/env node

/**
 * Ashley AI Migration Script
 * Migrates existing SQLite database to PostgreSQL with Ashley AI features
 */

import fs from 'fs'

console.log('🚀 Ashley AI Migration Script')
console.log('============================')

const steps = [
  {
    step: 1,
    title: 'Backup Current Database',
    description: 'Create backup of existing SQLite database',
    action: () => {
      console.log('📦 Creating backup of current database...')
      if (fs.existsSync('prisma/dev.db')) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        fs.copyFileSync('prisma/dev.db', `prisma/backup-${timestamp}.db`)
        console.log('✅ Database backup created')
      } else {
        console.log('⚠️  No existing database found')
      }
    }
  },
  {
    step: 2,
    title: 'Replace Schema',
    description: 'Replace current schema with Ashley AI schema',
    action: () => {
      console.log('🔄 Updating database schema...')
      if (fs.existsSync('prisma/schema-new.prisma')) {
        // Backup old schema
        fs.copyFileSync('prisma/schema.prisma', 'prisma/schema-old.prisma')
        // Replace with new schema
        fs.copyFileSync('prisma/schema-new.prisma', 'prisma/schema.prisma')
        console.log('✅ Schema updated to Ashley AI version')
      } else {
        console.log('❌ Ashley AI schema file not found!')
        process.exit(1)
      }
    }
  },
  {
    step: 3,
    title: 'Environment Setup',
    description: 'Setup environment variables for Ashley AI',
    action: () => {
      console.log('🔧 Setting up environment variables...')
      if (fs.existsSync('.env.ashley')) {
        if (!fs.existsSync('.env.local')) {
          fs.copyFileSync('.env.ashley', '.env.local')
          console.log('✅ Environment variables configured')
          console.log('⚠️  Please update .env.local with your actual values!')
        } else {
          console.log('⚠️  .env.local already exists. Please manually merge .env.ashley')
        }
      } else {
        console.log('❌ Ashley AI environment template not found!')
      }
    }
  },
  {
    step: 4,
    title: 'Dependencies Check',
    description: 'Check if all required dependencies are installed',
    action: () => {
      console.log('📋 Checking dependencies...')
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      
      const requiredDeps = [
        'openai',
        '@prisma/client',
        'next-auth'
      ]
      
      const missing = requiredDeps.filter(dep => 
        !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
      )
      
      if (missing.length > 0) {
        console.log('❌ Missing dependencies:', missing.join(', '))
        console.log('Run: npm install openai @prisma/client next-auth')
        process.exit(1)
      } else {
        console.log('✅ All required dependencies found')
      }
    }
  }
]

async function runMigration() {
  console.log('Starting Ashley AI migration...\n')
  
  for (const { step, title, description, action } of steps) {
    console.log(`\n📍 Step ${step}: ${title}`)
    console.log(`   ${description}`)
    console.log('   ' + '─'.repeat(50))
    
    try {
      await action()
    } catch (error) {
      console.log(`❌ Error in step ${step}:`, error.message)
      process.exit(1)
    }
  }
  
  console.log('\n🎉 Ashley AI Migration Complete!')
  console.log('================================')
  console.log('')
  console.log('Next Steps:')
  console.log('1. Update .env.local with your actual values')
  console.log('2. Set up Supabase PostgreSQL database')
  console.log('3. Get OpenAI API key')
  console.log('4. Run: npx prisma db push')
  console.log('5. Run: npx prisma generate')
  console.log('6. Run: npm run dev')
  console.log('')
  console.log('📚 Documentation: Check AI_FEATURES_DOCUMENTATION.md')
  console.log('🚀 Ready to deploy Ashley AI!')
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error)
}

export { runMigration }