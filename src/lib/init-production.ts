import { db } from './db';
import bcrypt from 'bcryptjs';

export async function initializeProductionDatabase() {
  try {
    console.log('🚀 Initializing ASH AI Production Database...');

    // Check if database is accessible
    await db.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Check if admin user exists
    const existingAdmin = await db.user.findFirst({
      where: { email: 'admin@ash-ai.com' }
    });

    if (!existingAdmin) {
      console.log('🔧 Creating admin user...');
      
      // Create workspace first
      const _workspace = await db.workspace.create({
        data: {
          name: 'ASH AI Production',
          slug: 'ash-ai-prod',
          created_by: 'system'
        }
      });

      // Create admin user
      const hashedPassword = await bcrypt.hash('AshAI2024!', 12);
      const adminUser = await db.user.create({
        data: {
          email: 'admin@ash-ai.com',
          name: 'ASH AI Administrator',
          password: hashedPassword,
          role: 'ADMIN',
          workspace_id: workspace.id,
          is_verified: true
        }
      });

      console.log('✅ Admin user created successfully');
      
      // Create sample client for demo
      await db.client.create({
        data: {
          name: 'Demo Client',
          email: 'demo@client.com',
          phone: '+639171234567',
          address: 'Makati City, Metro Manila, Philippines',
          workspace_id: workspace.id,
          created_by: adminUser.id
        }
      });

      console.log('✅ Sample data created');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('🎉 Production database initialized successfully!');
    return true;
  } catch (_error) {
    console.error('❌ Failed to initialize production database:', error);
    return false;
  }
}

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production' && process.env.ASH_SEED_DATABASE === 'true') {
  initializeProductionDatabase().catch(console.error);
}