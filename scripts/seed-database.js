#!/usr/bin/env node

/**
 * Database Seeding Script for ASH AI
 * Seeds the database with initial production data
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function log(message) {
  console.log(`🌱 [SEED] ${message}`);
}

function success(message) {
  console.log(`✅ [SEED] ${message}`);
}

function error(message) {
  console.error(`❌ [SEED] ${message}`);
}

async function seedWorkspaces() {
  log('Creating default workspace...');

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'sorbetes-apparel' },
    update: {},
    create: {
      name: 'Sorbetes Apparel Studio',
      slug: 'sorbetes-apparel',
      description: 'Main manufacturing workspace for Sorbetes Apparel Studio',
      settings: {
        timezone: 'Asia/Manila',
        currency: 'PHP',
        locale: 'en-PH',
        businessHours: {
          start: '08:00',
          end: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        manufacturing: {
          defaultLeadTime: 14,
          qualityStandard: 'AQL_2_5',
          productionCapacity: 1000
        }
      }
    }
  });

  success(`Created workspace: ${workspace.name}`);
  return workspace;
}

async function seedUsers(workspaceId) {
  log('Creating default users...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const managerPassword = await bcrypt.hash('manager123', 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sorbetesapparel.com' },
    update: {},
    create: {
      email: 'admin@sorbetesapparel.com',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      workspaceId: workspaceId,
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+639123456789',
        department: 'IT',
        position: 'System Administrator',
        employeeId: 'ADMIN001',
        dateHired: new Date('2024-01-01'),
        isActive: true
      }
    }
  });

  // Production Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@sorbetesapparel.com' },
    update: {},
    create: {
      email: 'manager@sorbetesapparel.com',
      name: 'Production Manager',
      password: managerPassword,
      role: 'MANAGER',
      workspaceId: workspaceId,
      profile: {
        firstName: 'Production',
        lastName: 'Manager',
        phone: '+639123456788',
        department: 'Production',
        position: 'Production Manager',
        employeeId: 'MGR001',
        dateHired: new Date('2024-01-01'),
        isActive: true
      }
    }
  });

  success(`Created ${admin.role}: ${admin.email}`);
  success(`Created ${manager.role}: ${manager.email}`);

  return { admin, manager };
}

async function seedClients(workspaceId) {
  log('Creating sample clients...');

  const clients = [
    {
      name: 'ABC Retail Corporation',
      email: 'orders@abcretail.com',
      phone: '+639123456701',
      address: '123 Business Ave, Makati City, Metro Manila',
      contactPerson: 'John Dela Cruz',
      businessType: 'RETAIL'
    },
    {
      name: 'Fashion Forward Inc.',
      email: 'procurement@fashionforward.com',
      phone: '+639123456702',
      address: '456 Fashion St, BGC, Taguig City',
      contactPerson: 'Maria Santos',
      businessType: 'WHOLESALE'
    },
    {
      name: 'School Uniform Suppliers',
      email: 'orders@schooluniforms.ph',
      phone: '+639123456703',
      address: '789 Education Rd, Quezon City',
      contactPerson: 'Robert Tan',
      businessType: 'INSTITUTIONAL'
    }
  ];

  const createdClients = [];
  for (const clientData of clients) {
    const client = await prisma.client.upsert({
      where: { email: clientData.email },
      update: {},
      create: {
        ...clientData,
        workspaceId: workspaceId,
        isActive: true,
        creditLimit: 100000.00,
        paymentTerms: 'NET_30'
      }
    });
    createdClients.push(client);
    success(`Created client: ${client.name}`);
  }

  return createdClients;
}

async function seedWorkcenters(workspaceId) {
  log('Creating production workcenters...');

  const workcenters = [
    {
      name: 'Cutting Station',
      code: 'CUT001',
      type: 'CUTTING',
      description: 'Main fabric cutting area',
      capacity: 8,
      isActive: true
    },
    {
      name: 'Silkscreen Printing',
      code: 'PRT001',
      type: 'PRINTING',
      description: 'Silkscreen printing station',
      capacity: 4,
      isActive: true
    },
    {
      name: 'Sublimation Printing',
      code: 'PRT002',
      type: 'PRINTING',
      description: 'Sublimation printing station',
      capacity: 2,
      isActive: true
    },
    {
      name: 'Sewing Line A',
      code: 'SEW001',
      type: 'SEWING',
      description: 'Main sewing line for t-shirts',
      capacity: 20,
      isActive: true
    },
    {
      name: 'Quality Control',
      code: 'QC001',
      type: 'QUALITY_CONTROL',
      description: 'Final quality inspection',
      capacity: 6,
      isActive: true
    },
    {
      name: 'Finishing & Packing',
      code: 'FIN001',
      type: 'FINISHING',
      description: 'Final finishing and packaging',
      capacity: 8,
      isActive: true
    }
  ];

  const createdWorkcenters = [];
  for (const wcData of workcenters) {
    const workcenter = await prisma.workcenter.upsert({
      where: { code: wcData.code },
      update: {},
      create: {
        ...wcData,
        workspaceId: workspaceId
      }
    });
    createdWorkcenters.push(workcenter);
    success(`Created workcenter: ${workcenter.name}`);
  }

  return createdWorkcenters;
}

async function seedMaterials(workspaceId) {
  log('Creating material inventory...');

  const materials = [
    {
      code: 'FAB-COT-WHT-001',
      name: '100% Cotton White T-shirt Fabric',
      description: 'Premium cotton fabric for t-shirts',
      category: 'FABRIC',
      unit: 'METERS',
      costPerUnit: 85.00,
      minimumStock: 500,
      maximumStock: 2000,
      currentStock: 1200
    },
    {
      code: 'FAB-COT-BLK-001',
      name: '100% Cotton Black T-shirt Fabric',
      description: 'Premium cotton fabric for t-shirts',
      category: 'FABRIC',
      unit: 'METERS',
      costPerUnit: 90.00,
      minimumStock: 300,
      maximumStock: 1500,
      currentStock: 800
    },
    {
      code: 'INK-SLK-WHT-001',
      name: 'Silkscreen Ink - White',
      description: 'Water-based silkscreen printing ink',
      category: 'INK',
      unit: 'LITERS',
      costPerUnit: 450.00,
      minimumStock: 10,
      maximumStock: 50,
      currentStock: 25
    },
    {
      code: 'THR-POL-BLK-001',
      name: 'Polyester Thread - Black',
      description: 'High-strength polyester sewing thread',
      category: 'THREAD',
      unit: 'SPOOLS',
      costPerUnit: 15.00,
      minimumStock: 100,
      maximumStock: 500,
      currentStock: 250
    }
  ];

  const createdMaterials = [];
  for (const materialData of materials) {
    const material = await prisma.material.upsert({
      where: { code: materialData.code },
      update: {},
      create: {
        ...materialData,
        workspaceId: workspaceId,
        isActive: true
      }
    });
    createdMaterials.push(material);
    success(`Created material: ${material.name}`);
  }

  return createdMaterials;
}

async function seedSystemSettings(workspaceId) {
  log('Creating system settings...');

  const settings = [
    {
      key: 'COMPANY_NAME',
      value: 'Sorbetes Apparel Studio',
      category: 'COMPANY',
      description: 'Company name for documents and reports'
    },
    {
      key: 'COMPANY_ADDRESS',
      value: 'Industrial Complex, Laguna, Philippines',
      category: 'COMPANY',
      description: 'Company address for invoices and documents'
    },
    {
      key: 'BIR_TIN',
      value: '123-456-789-000',
      category: 'COMPLIANCE',
      description: 'BIR Tax Identification Number'
    },
    {
      key: 'DEFAULT_LEAD_TIME',
      value: '14',
      category: 'PRODUCTION',
      description: 'Default production lead time in days'
    },
    {
      key: 'QUALITY_STANDARD',
      value: 'AQL_2_5',
      category: 'QUALITY',
      description: 'Default quality control standard'
    }
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: {
        workspaceId_key: {
          workspaceId: workspaceId,
          key: setting.key
        }
      },
      update: {},
      create: {
        ...setting,
        workspaceId: workspaceId
      }
    });
  }

  success(`Created ${settings.length} system settings`);
}

async function main() {
  try {
    log('Starting database seeding...');

    // Create workspace
    const workspace = await seedWorkspaces();

    // Create users
    const users = await seedUsers(workspace.id);

    // Create clients
    const clients = await seedClients(workspace.id);

    // Create workcenters
    const workcenters = await seedWorkcenters(workspace.id);

    // Create materials
    const materials = await seedMaterials(workspace.id);

    // Create system settings
    await seedSystemSettings(workspace.id);

    success('🎉 Database seeding completed successfully!');
    log('');
    log('Default login credentials:');
    log('Admin: admin@sorbetesapparel.com / admin123');
    log('Manager: manager@sorbetesapparel.com / manager123');
    log('');
    log('You can now start the application and login with these credentials.');

  } catch (error) {
    error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };