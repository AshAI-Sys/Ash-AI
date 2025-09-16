// 🎖️ AUTOMATION INITIALIZATION API
// Commander Protocol: Initialize and start all automation systems
// Neural ERP - System Startup Controller

import { NextRequest, NextResponse } from 'next/server';
import { automationCoordinator } from '@/lib/automation-coordinator';
import { withApiHandler } from '@/lib/api-handler';

// GET: Initialize automation systems
async function GET(request: NextRequest) {
  try {
    console.log('🎖️ [AUTOMATION INIT] Starting automation systems initialization...');

    // Initialize automation coordinator
    await automationCoordinator.initialize();

    // Get system status
    const status = automationCoordinator.getAutomationStatus();

    console.log('🎖️ [AUTOMATION INIT] All automation systems successfully initialized!');

    return NextResponse.json({
      success: true,
      message: 'Automation systems initialized successfully',
      data: {
        status: 'INITIALIZED',
        automation_status: status,
        timestamp: new Date().toISOString(),
        systems: [
          'Workflow Engine',
          'Approval Engine',
          'Production Tracker',
          'Work Order Manager',
          'Automation Coordinator'
        ]
      }
    });
  } catch (error) {
    console.error('🚨 [AUTOMATION INIT] Initialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize automation systems' },
      { status: 500 }
    );
  }
}

export { withApiHandler(GET) as GET };