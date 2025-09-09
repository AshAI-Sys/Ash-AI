import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Check if database is already initialized
    const existingWorkspace = await db.workspace.findFirst();
    
    if (existingWorkspace) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database already initialized',
        workspace: existingWorkspace.name
      });
    }

    console.log('🚀 Initializing ASH AI Production Database...');

    // Create workspace
    const workspace = await db.workspace.create({
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
        is_verified: true,
        avatar_url: null
      }
    });

    // Create sample client
    const client = await db.client.create({
      data: {
        name: 'Demo Client',
        email: 'demo@client.com',
        phone: '+639171234567',
        address: 'Makati City, Metro Manila, Philippines',
        workspace_id: workspace.id,
        created_by: adminUser.id
      }
    });

    // Create sample brand
    await db.brand.create({
      data: {
        name: 'Demo Brand',
        client_id: client.id,
        workspace_id: workspace.id,
        created_by: adminUser.id
      }
    });

    // Create sample order to demonstrate the system
    await db.order.create({
      data: {
        po_number: 'DEMO-001',
        client_id: client.id,
        total_amount: 10000,
        status: 'DRAFT',
        workspace_id: workspace.id,
        created_by: adminUser.id,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    });

    console.log('✅ Production database initialized successfully!');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        workspace: workspace.name,
        adminEmail: 'admin@ash-ai.com',
        defaultPassword: 'AshAI2024!'
      }
    });

  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to initialize database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}