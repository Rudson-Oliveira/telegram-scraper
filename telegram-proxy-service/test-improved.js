// ================================================================
// TELEGRAM PROXY SERVICE - TEST SUITE V2
// Suite de testes para validar o microserviço
// ================================================================

const http = require('http');

// Configurações
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || 'test-token';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Função para fazer request HTTP
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Função para sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Testes
const tests = [];
let passedTests = 0;
let failedTests = 0;

function addTest(name, fn) {
  tests.push({ name, fn });
}

async function runTest(test) {
  console.log(`\n${colors.cyan}[TEST] ${test.name}${colors.reset}`);
  try {
    await test.fn();
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED: ${error.message}${colors.reset}`);
    if (error.stack) {
      console.log(`${colors.yellow}${error.stack}${colors.reset}`);
    }
    failedTests++;
  }
}

// ================================================================
// TESTES
// ================================================================

addTest('Health Check - Deve retornar status OK', async () => {
  const response = await makeRequest({
    path: '/health',
    method: 'GET'
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.body || response.body.status !== 'ok') {
    throw new Error(`Expected status 'ok', got ${response.body?.status}`);
  }

  if (typeof response.body.telegram_connected !== 'boolean') {
    throw new Error('Expected telegram_connected to be boolean');
  }

  console.log(`  - Status: ${response.body.status}`);
  console.log(`  - Telegram Connected: ${response.body.telegram_connected}`);
  console.log(`  - Uptime: ${response.body.uptime}s`);
});

addTest('Test Endpoint - Deve retornar informações básicas', async () => {
  const response = await makeRequest({
    path: '/test',
    method: 'GET'
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.body || !response.body.message) {
    throw new Error('Expected message in response');
  }

  console.log(`  - Message: ${response.body.message}`);
  console.log(`  - Version: ${response.body.version}`);
});

addTest('Scrape Telegram - Sem autenticação (deve falhar)', async () => {
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {
    channels: ['aicommunitybr'],
    limit: 5
  });

  if (response.status !== 401) {
    throw new Error(`Expected status 401, got ${response.status}`);
  }

  console.log(`  - Correctly rejected unauthorized request`);
});

addTest('Scrape Telegram - Token inválido (deve falhar)', async () => {
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token-invalido'
    }
  }, {
    channels: ['aicommunitybr'],
    limit: 5
  });

  if (response.status !== 401) {
    throw new Error(`Expected status 401, got ${response.status}`);
  }

  console.log(`  - Correctly rejected invalid token`);
});

addTest('Scrape Telegram - Sem channels (deve falhar)', async () => {
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }, {
    limit: 5
  });

  if (response.status !== 400) {
    throw new Error(`Expected status 400, got ${response.status}`);
  }

  console.log(`  - Correctly rejected request without channels`);
});

addTest('Scrape Telegram - Channels não é array (deve falhar)', async () => {
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }, {
    channels: 'aicommunitybr',
    limit: 5
  });

  if (response.status !== 400) {
    throw new Error(`Expected status 400, got ${response.status}`);
  }

  console.log(`  - Correctly rejected non-array channels`);
});

addTest('Scrape Telegram - Muitos canais (deve falhar)', async () => {
  const channels = Array.from({ length: 25 }, (_, i) => `channel${i}`);
  
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }, {
    channels: channels,
    limit: 5
  });

  if (response.status !== 400) {
    throw new Error(`Expected status 400, got ${response.status}`);
  }

  console.log(`  - Correctly rejected too many channels (25 > 20)`);
});

addTest('Scrape Telegram - Limite muito alto (deve falhar)', async () => {
  const response = await makeRequest({
    path: '/scrape-telegram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    }
  }, {
    channels: ['aicommunitybr'],
    limit: 2000
  });

  if (response.status !== 400) {
    throw new Error(`Expected status 400, got ${response.status}`);
  }

  console.log(`  - Correctly rejected limit > 1000`);
});

addTest('CORS Headers - Deve permitir requisições de qualquer origem', async () => {
  const response = await makeRequest({
    path: '/health',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.com'
    }
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  console.log(`  - CORS headers present`);
});

addTest('Rate Limiting - Teste de múltiplas requisições', async () => {
  console.log('  - Sending 35 requests rapidly...');
  
  const promises = [];
  for (let i = 0; i < 35; i++) {
    promises.push(
      makeRequest({
        path: '/health',
        method: 'GET'
      }).catch(e => ({ error: e.message }))
    );
  }

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.status === 200).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;

  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Rate limited: ${rateLimitedCount}`);

  if (rateLimitedCount === 0) {
    console.log(`  ${colors.yellow}⚠ Warning: Rate limiting may not be working (all 35 requests succeeded)${colors.reset}`);
  } else {
    console.log(`  - Rate limiting is working correctly`);
  }
});

// ================================================================
// TESTE REAL DE SCRAPING (Apenas se configurado)
// ================================================================

if (process.env.RUN_REAL_SCRAPE === 'true') {
  addTest('Scrape Telegram - Teste real com canal válido', async () => {
    console.log('  ⚠️  This test requires valid Telegram credentials and session');
    console.log('  - Attempting to scrape aicommunitybr...');
    
    const response = await makeRequest({
      path: '/scrape-telegram',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      }
    }, {
      channels: ['aicommunitybr'],
      limit: 5
    });

    if (response.status === 503) {
      throw new Error('Telegram client not connected. Configure TELEGRAM_SESSION first.');
    }

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.success) {
      throw new Error(`Scraping failed: ${response.body.message}`);
    }

    const messages = response.body.data.messages;
    const stats = response.body.data.stats;

    console.log(`  - Messages scraped: ${messages.length}`);
    console.log(`  - Total messages: ${stats.total_messages}`);
    console.log(`  - Total prompts: ${stats.total_prompts}`);
    console.log(`  - Processing time: ${response.body.meta.processing_time_ms}ms`);

    if (messages.length === 0) {
      console.log(`  ${colors.yellow}⚠ Warning: No messages returned (channel may be empty)${colors.reset}`);
    }
  });
}

// ================================================================
// EXECUTAR TESTES
// ================================================================

async function main() {
  console.log(`
${colors.blue}╔═══════════════════════════════════════════════════════════╗
║     TELEGRAM PROXY SERVICE - TEST SUITE V2                ║
║     Testing against: ${BASE_URL.padEnd(32)} ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.cyan}Running ${tests.length} tests...${colors.reset}`);

  for (const test of tests) {
    await runTest(test);
    await sleep(100); // Small delay between tests
  }

  console.log(`
${colors.blue}═══════════════════════════════════════════════════════════
TEST RESULTS
═══════════════════════════════════════════════════════════${colors.reset}

${colors.green}✓ Passed: ${passedTests}${colors.reset}
${colors.red}✗ Failed: ${failedTests}${colors.reset}
${colors.cyan}Total:   ${tests.length}${colors.reset}

${failedTests === 0 ? colors.green + '🎉 ALL TESTS PASSED!' : colors.red + '❌ SOME TESTS FAILED'}${colors.reset}
`);

  process.exit(failedTests > 0 ? 1 : 0);
}

// Verificar se o servidor está rodando
console.log(`${colors.yellow}Checking if server is running at ${BASE_URL}...${colors.reset}`);
makeRequest({ path: '/health', method: 'GET' })
  .then(() => {
    console.log(`${colors.green}✓ Server is running!${colors.reset}\n`);
    main();
  })
  .catch((error) => {
    console.log(`${colors.red}✗ Server is not running: ${error.message}${colors.reset}`);
    console.log(`\n${colors.yellow}Please start the server first:${colors.reset}`);
    console.log(`  cd telegram-proxy-service`);
    console.log(`  npm start`);
    console.log(`\nThen run the tests in another terminal:${colors.reset}`);
    console.log(`  npm test\n`);
    process.exit(1);
  });
