// Quick server health check
console.log('🔍 Checking server health...')

const fetch = require('node-fetch')

async function testServerHealth() {
  try {
    const response = await fetch('http://localhost:3009/api/auth/session')
    console.log(`✅ Server responding: Status ${response.status}`)
    
    const testAPIs = [
      '/api/brands',
      '/api/clients', 
      '/api/ash/orders'
    ]
    
    for (const api of testAPIs) {
      try {
        const apiResponse = await fetch(`http://localhost:3009${api}`)
        if (apiResponse.status < 500) {
          console.log(`✅ ${api}: Status ${apiResponse.status}`)
        } else {
          console.log(`❌ ${api}: Status ${apiResponse.status}`)
        }
      } catch (error) {
        console.log(`❌ ${api}: Error - ${error.message}`)
      }
    }
    
    console.log('🎉 Server health check complete!')
    
  } catch (error) {
    console.error('❌ Server health check failed:', error.message)
  }
}

testServerHealth()