// ================================================================
// TEST SCRIPT - TELEGRAM PROXY SERVICE
// Script para testar o microserviço localmente
// ================================================================

require('dotenv').config();

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || 'secure-token-change-me';

console.log('🧪 Testing Telegram Proxy Service\n');
console.log(`API URL: ${API_URL}`);
console.log(`API Token: ${API_TOKEN.substring(0, 10)}...\n`);

// ================================================================
// TEST 1: Health Check
// ================================================================
async function testHealthCheck() {
  console.log('📍 Test 1: Health Check');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${data.status}`);
      console.log(`   Telegram Connected: ${data.telegram_connected}`);
      console.log(`   Uptime: ${Math.floor(data.uptime)}s\n`);
      return true;
    } else {
      console.log('❌ Health check failed');
      console.log(`   Status: ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    console.log('   ⚠️  Make sure the service is running!\n');
    return false;
  }
}

// ================================================================
// TEST 2: Test Endpoint
// ================================================================
async function testTestEndpoint() {
  console.log('📍 Test 2: Test Endpoint');
  
  try {
    const response = await fetch(`${API_URL}/test`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test endpoint passed');
      console.log(`   Message: ${data.message}`);
      console.log(`   Version: ${data.version}\n`);
      return true;
    } else {
      console.log('❌ Test endpoint failed\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Test endpoint error:', error.message, '\n');
    return false;
  }
}

// ================================================================
// TEST 3: Authentication
// ================================================================
async function testAuthentication() {
  console.log('📍 Test 3: Authentication');
  
  // Test without token
  try {
    const response = await fetch(`${API_URL}/scrape-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channels: ['test'], limit: 1 })
    });
    
    if (response.status === 401) {
      console.log('✅ Authentication rejection works (no token)');
    } else {
      console.log('⚠️  Expected 401, got:', response.status);
    }
  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }
  
  // Test with invalid token
  try {
    const response = await fetch(`${API_URL}/scrape-telegram`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channels: ['test'], limit: 1 })
    });
    
    if (response.status === 401) {
      console.log('✅ Authentication rejection works (invalid token)');
    } else {
      console.log('⚠️  Expected 401, got:', response.status);
    }
  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }
  
  // Test with valid token
  try {
    const response = await fetch(`${API_URL}/scrape-telegram`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channels: ['aicommunitybr'], limit: 1 })
    });
    
    if (response.status !== 401) {
      console.log('✅ Authentication acceptance works (valid token)\n');
      return true;
    } else {
      console.log('❌ Valid token was rejected\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Auth test error:', error.message, '\n');
    return false;
  }
}

// ================================================================
// TEST 4: Scraping (requires valid Telegram credentials)
// ================================================================
async function testScraping() {
  console.log('📍 Test 4: Scraping (OPTIONAL - requires Telegram config)');
  
  // Check if Telegram is configured
  if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
    console.log('⚠️  Skipping - Telegram credentials not configured');
    console.log('   Configure TELEGRAM_API_ID and TELEGRAM_API_HASH to test scraping\n');
    return null;
  }
  
  try {
    console.log('   Attempting to scrape 5 messages from aicommunitybr...');
    
    const response = await fetch(`${API_URL}/scrape-telegram`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channels: ['aicommunitybr'],
        limit: 5
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Scraping test passed');
      console.log(`   Total messages: ${data.data.stats.total_messages}`);
      console.log(`   Channels processed: ${data.data.stats.channels_processed.length}`);
      console.log(`   Processing time: ${data.meta.processing_time_ms}ms\n`);
      
      if (data.data.messages.length > 0) {
        const firstMsg = data.data.messages[0];
        console.log('   Sample message:');
        console.log(`   - ID: ${firstMsg.id}`);
        console.log(`   - Channel: ${firstMsg.channel}`);
        console.log(`   - Type: ${firstMsg.message_type}`);
        console.log(`   - Content: ${firstMsg.content.substring(0, 100)}...`);
        console.log();
      }
      
      return true;
    } else {
      console.log('❌ Scraping test failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error || data.message || 'Unknown'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Scraping test error:', error.message);
    console.log('   ⚠️  This is normal if Telegram is not configured yet\n');
    return false;
  }
}

// ================================================================
// RUN ALL TESTS
// ================================================================
async function runTests() {
  console.log('═'.repeat(60));
  console.log('  TELEGRAM PROXY SERVICE - TEST SUITE');
  console.log('═'.repeat(60));
  console.log();
  
  const results = {
    health: await testHealthCheck(),
    test: await testTestEndpoint(),
    auth: await testAuthentication(),
    scraping: await testScraping()
  };
  
  console.log('═'.repeat(60));
  console.log('  TEST RESULTS');
  console.log('═'.repeat(60));
  console.log();
  console.log(`Health Check:     ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test Endpoint:    ${results.test ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication:   ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Scraping:         ${results.scraping === null ? '⚠️  SKIP' : results.scraping ? '✅ PASS' : '❌ FAIL'}`);
  console.log();
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.values(results).filter(r => r !== null).length;
  
  console.log(`Total: ${passed}/${total} tests passed`);
  console.log();
  
  if (passed === total) {
    console.log('🎉 All tests passed! Service is ready to use.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  console.log();
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
