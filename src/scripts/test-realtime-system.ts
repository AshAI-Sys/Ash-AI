// Real-time System Test Script for ASH AI ERP
// Demonstrates real-time notifications, WebSocket connections, and workflow triggers

import { WorkflowTriggerHelpers } from '../lib/real-time-triggers'

// Test data for demonstration
const testOrderData = {
  id: 'test_order_123',
  po_number: 'ASH-2025-TEST001',
  client_id: 'test_client_456',
  status: 'DESIGN_APPROVAL',
  product_type: 'Custom T-Shirt',
  total_qty: 100,
  target_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  client: {
    name: 'Test Client Corp',
    id: 'test_client_456'
  }
}

const testProductionData = {
  id: 'routing_step_789',
  order_id: 'test_order_123',
  workcenter: 'CUTTING',
  status: 'COMPLETED',
  efficiency_percentage: 95,
  order: {
    po_number: 'ASH-2025-TEST001',
    client_id: 'test_client_456',
    client: { name: 'Test Client Corp' }
  }
}

const testDesignData = {
  id: 'design_asset_101',
  order_id: 'test_order_123',
  file_name: 'TEST_DESIGN_MOCKUP_V1.png',
  version: 1,
  type: 'mockup',
  approval_status: 'PENDING_CLIENT_APPROVAL',
  order: {
    po_number: 'ASH-2025-TEST001',
    client_id: 'test_client_456',
    client: { name: 'Test Client Corp' }
  }
}

// Test functions
export class RealTimeSystemTester {
  
  static async runFullSystemTest() {
    console.log('🧪 Starting Real-time System Test Suite...\n')
    
    await this.testOrderStatusChangeNotifications()
    await this.sleep(2000)
    
    await this.testProductionWorkflowTriggers()
    await this.sleep(2000)
    
    await this.testDesignApprovalNotifications()
    await this.sleep(2000)
    
    await this.testWebSocketConnection()
    await this.sleep(2000)
    
    await this.testClientPortalIntegration()
    await this.sleep(2000)
    
    await this.testAshleyAIIntegration()
    
    console.log('\n✅ Real-time System Test Suite Completed!')
  }

  static async testOrderStatusChangeNotifications() {
    console.log('📋 Testing Order Status Change Notifications...')
    
    try {
      // Test status transition from DESIGN_APPROVAL to IN_PROGRESS
      await WorkflowTriggerHelpers.triggerOrderStatusChange(
        testOrderData.id,
        'DESIGN_APPROVAL',
        'IN_PROGRESS',
        testOrderData,
        'default',
        'test_user_123'
      )
      
      console.log('✅ Order status change trigger sent successfully')
      
      // Test high-priority status change to READY_FOR_DELIVERY
      await WorkflowTriggerHelpers.triggerOrderStatusChange(
        testOrderData.id,
        'IN_PROGRESS',
        'READY_FOR_DELIVERY',
        { ...testOrderData, status: 'READY_FOR_DELIVERY' },
        'default',
        'test_user_123'
      )
      
      console.log('✅ High-priority delivery notification sent')
      
    } catch (error) {
      console.error('❌ Order status change test failed:', error)
    }
  }

  static async testProductionWorkflowTriggers() {
    console.log('🏭 Testing Production Workflow Triggers...')
    
    try {
      // Test production stage completion
      await WorkflowTriggerHelpers.triggerProductionStageComplete(
        testProductionData.id,
        testProductionData,
        'default',
        'test_operator_456'
      )
      
      console.log('✅ Production stage completion trigger sent')
      
      // Test multiple stage progression
      const stages = ['PRINTING', 'SEWING', 'QC']
      
      for (const stage of stages) {
        await WorkflowTriggerHelpers.triggerProductionStageComplete(
          `routing_step_${stage.toLowerCase()}`,
          {
            ...testProductionData,
            id: `routing_step_${stage.toLowerCase()}`,
            workcenter: stage,
            efficiency_percentage: Math.floor(Math.random() * 20) + 80
          },
          'default',
          'test_operator_456'
        )
        
        console.log(`✅ ${stage} stage completion notification sent`)
        await this.sleep(500)
      }
      
    } catch (error) {
      console.error('❌ Production workflow test failed:', error)
    }
  }

  static async testDesignApprovalNotifications() {
    console.log('🎨 Testing Design Approval Notifications...')
    
    try {
      // Test design upload requiring approval
      await WorkflowTriggerHelpers.triggerDesignUpload(
        testDesignData.id,
        testDesignData,
        'default',
        'test_designer_789'
      )
      
      console.log('✅ Design approval notification sent')
      
      // Test design revision request
      await WorkflowTriggerHelpers.triggerDesignUpload(
        'design_asset_102',
        {
          ...testDesignData,
          id: 'design_asset_102',
          version: 2,
          file_name: 'TEST_DESIGN_MOCKUP_V2_REVISED.png',
          approval_status: 'PENDING_CLIENT_APPROVAL'
        },
        'default',
        'test_designer_789'
      )
      
      console.log('✅ Design revision notification sent')
      
    } catch (error) {
      console.error('❌ Design approval test failed:', error)
    }
  }

  static async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket Connection...')
    
    try {
      // Test manual notification sending
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'test',
          type: 'system_test',
          message: 'Real-time system test notification',
          data: {
            test_id: 'realtime_test_001',
            timestamp: new Date().toISOString(),
            system_status: 'testing'
          },
          priority: 'normal'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ WebSocket notification sent:', result.notification_id)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      console.error('❌ WebSocket connection test failed:', error)
    }
  }

  static async testClientPortalIntegration() {
    console.log('👥 Testing Client Portal Integration...')
    
    try {
      // Test client-specific notifications
      const clientNotifications = [
        {
          type: 'order_status_change',
          message: 'Your order ASH-2025-TEST001 is now in production',
          priority: 'high'
        },
        {
          type: 'design_approval_needed',
          message: 'New design uploaded for review - ASH-2025-TEST001',
          priority: 'high'
        },
        {
          type: 'delivery_scheduled',
          message: 'Delivery scheduled for next Monday',
          priority: 'normal'
        }
      ]
      
      for (const notification of clientNotifications) {
        await fetch('/api/websocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'client-portal',
            type: notification.type,
            message: notification.message,
            data: {
              order_id: testOrderData.id,
              po_number: testOrderData.po_number,
              client_test: true
            },
            target_client_id: testOrderData.client_id,
            priority: notification.priority
          })
        })
        
        console.log(`✅ Client notification sent: ${notification.type}`)
        await this.sleep(300)
      }
      
    } catch (error) {
      console.error('❌ Client portal integration test failed:', error)
    }
  }

  static async testAshleyAIIntegration() {
    console.log('🤖 Testing Ashley AI Integration...')
    
    try {
      // Test AI insight notifications
      const aiInsights = [
        {
          type: 'ai_alert',
          message: 'Ashley AI detected production bottleneck',
          insight: 'Production efficiency in cutting stage has dropped to 75%. Recommend immediate attention to maintain delivery schedules.',
          priority: 'high'
        },
        {
          type: 'ai_optimization',
          message: 'Ashley AI suggests process optimization',
          insight: 'Order batching could improve efficiency by 15%. Consider grouping similar orders for production runs.',
          priority: 'normal'
        },
        {
          type: 'ai_production_insight',
          message: 'Ashley AI provides production forecast',
          insight: 'Current production rate will meet 90% of delivery targets this week. Consider overtime for critical orders.',
          priority: 'normal'
        }
      ]
      
      for (const insight of aiInsights) {
        await fetch('/api/websocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'ai-insights',
            type: insight.type,
            message: insight.message,
            data: {
              insight: insight.insight,
              ai_confidence: insight.priority === 'high' ? 'high' : 'medium',
              context_orders: 15,
              context_production: 8,
              test_mode: true
            },
            priority: insight.priority
          })
        })
        
        console.log(`✅ AI insight notification sent: ${insight.type}`)
        await this.sleep(400)
      }
      
    } catch (error) {
      console.error('❌ Ashley AI integration test failed:', error)
    }
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Performance test for high-volume scenarios
  static async testHighVolumeNotifications() {
    console.log('📊 Testing High-Volume Notification Performance...')
    
    const startTime = Date.now()
    const notificationCount = 50
    
    try {
      const promises = []
      
      for (let i = 0; i < notificationCount; i++) {
        const promise = fetch('/api/websocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'performance-test',
            type: 'volume_test',
            message: `Performance test notification ${i + 1}`,
            data: {
              sequence: i + 1,
              batch_id: 'perf_test_001',
              timestamp: new Date().toISOString()
            },
            priority: 'low'
          })
        })
        
        promises.push(promise)
        
        // Add small delay to avoid overwhelming the server
        if (i % 10 === 9) {
          await this.sleep(100)
        }
      }
      
      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      const avgTime = duration / notificationCount
      
      console.log(`✅ High-volume test completed:`)
      console.log(`   📈 ${notificationCount} notifications sent`)
      console.log(`   ⏱️  Total time: ${duration}ms`)
      console.log(`   📊 Average time per notification: ${avgTime.toFixed(2)}ms`)
      
    } catch (error) {
      console.error('❌ High-volume notification test failed:', error)
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  RealTimeSystemTester.runFullSystemTest()
    .then(() => {
      console.log('\n🎉 All tests completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error)
      process.exit(1)
    })
}