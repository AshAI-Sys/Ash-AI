// Test OpenAI API Key Configuration
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASH_OPENAI_API_KEY = process.env.ASH_OPENAI_API_KEY;

console.log('🤖 ASH AI - OpenAI API Key Test');
console.log('================================');

// Check if API keys exist
console.log('✅ OPENAI_API_KEY exists:', OPENAI_API_KEY ? 'YES' : 'NO');
console.log('✅ ASH_OPENAI_API_KEY exists:', ASH_OPENAI_API_KEY ? 'YES' : 'NO');

if (OPENAI_API_KEY) {
  console.log('📋 API Key format check:');
  console.log('   - Starts with sk-:', OPENAI_API_KEY.startsWith('sk-') ? 'YES ✅' : 'NO ❌');
  console.log('   - Length:', OPENAI_API_KEY.length, 'characters');
  console.log('   - First 10 chars:', OPENAI_API_KEY.substring(0, 10) + '...');
  
  // Test API call
  console.log('\n🧪 Testing API connection...');
  
  fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 API Response Status:', response.status);
    if (response.status === 200) {
      console.log('🎉 SUCCESS: API key is working! Ashley AI is ready! 🤖');
    } else if (response.status === 401) {
      console.log('❌ ERROR: Invalid API key - please check your key');
    } else {
      console.log('⚠️ WARNING: Unexpected response:', response.status);
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.log('❌ API Error:', data.error.message);
    } else if (data.data) {
      console.log('✅ Available models:', data.data.length);
    }
  })
  .catch(error => {
    console.log('🌐 Network Error:', error.message);
  });
} else {
  console.log('❌ No API key found in environment variables');
}