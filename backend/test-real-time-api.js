/**
 * Simple test script for Real-Time Scanner API
 * Run with: node test-real-time-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const USER_ID = 'test-user-123';

const headers = {
  'Content-Type': 'application/json',
  'x-user-id': USER_ID,
};

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: response,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            error: error.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  console.log('=== Testing Real-Time Scanner API ===\n');

  try {
    // Test 1: Get signal definitions
    console.log('Test 1: GET /api/real-time-scanner/signals');
    const signalsResponse = await makeRequest('GET', '/api/real-time-scanner/signals');
    console.log(`Status: ${signalsResponse.status}`);
    if (signalsResponse.status === 200) {
      console.log(`✓ Found ${signalsResponse.body.length} signal definitions\n`);
    } else {
      console.log(`✗ Failed: ${JSON.stringify(signalsResponse.body)}\n`);
    }

    // Test 2: Get scan presets
    console.log('Test 2: GET /api/real-time-scanner/presets');
    const presetsResponse = await makeRequest('GET', '/api/real-time-scanner/presets');
    console.log(`Status: ${presetsResponse.status}`);
    if (presetsResponse.status === 200) {
      console.log(`✓ Found ${presetsResponse.body.length} scan presets\n`);
    } else {
      console.log(`✗ Failed: ${JSON.stringify(presetsResponse.body)}\n`);
    }

    // Test 3: Get scanner configuration
    console.log('Test 3: GET /api/real-time-scanner/config');
    const configResponse = await makeRequest('GET', '/api/real-time-scanner/config');
    console.log(`Status: ${configResponse.status}`);
    if (configResponse.status === 200) {
      console.log(`✓ Found ${configResponse.body.length} configuration items\n`);
    } else {
      console.log(`✗ Failed: ${JSON.stringify(configResponse.body)}\n`);
    }

    // Test 4: Start a scan session
    console.log('Test 4: POST /api/real-time-scanner/scan/start');
    const scanData = {
      scope: {
        type: 'CUSTOM',
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
      },
      signals: ['RSI', 'EMA'],
    };
    
    const startResponse = await makeRequest('POST', '/api/real-time-scanner/scan/start', scanData);
    console.log(`Status: ${startResponse.status}`);
    
    if (startResponse.status === 202) {
      const sessionId = startResponse.body.sessionId;
      console.log(`✓ Scan session started: ${sessionId}`);
      console.log(`  Total symbols: ${startResponse.body.totalSymbols}`);
      console.log(`  Poll URL: ${startResponse.body.pollUrl}`);
      console.log(`  Results URL: ${startResponse.body.resultsUrl}\n`);

      // Test 5: Get session progress
      console.log('Test 5: GET /api/real-time-scanner/scan/:sessionId/progress');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
      
      const progressResponse = await makeRequest('GET', `/api/real-time-scanner/scan/${sessionId}/progress`);
      console.log(`Status: ${progressResponse.status}`);
      if (progressResponse.status === 200) {
        console.log(`✓ Progress: ${progressResponse.body.progress.completed}/${progressResponse.body.progress.total} (${progressResponse.body.progress.percentage}%)\n`);
      } else {
        console.log(`✗ Failed: ${JSON.stringify(progressResponse.body)}\n`);
      }

      // Test 6: Get user sessions
      console.log('Test 6: GET /api/real-time-scanner/sessions');
      const sessionsResponse = await makeRequest('GET', '/api/real-time-scanner/sessions?limit=5');
      console.log(`Status: ${sessionsResponse.status}`);
      if (sessionsResponse.status === 200) {
        console.log(`✓ Found ${sessionsResponse.body.length} sessions\n`);
      } else {
        console.log(`✗ Failed: ${JSON.stringify(sessionsResponse.body)}\n`);
      }

      // Test 7: Get dashboard data
      console.log('Test 7: GET /api/real-time-scanner/dashboard');
      const dashboardResponse = await makeRequest('GET', '/api/real-time-scanner/dashboard');
      console.log(`Status: ${dashboardResponse.status}`);
      if (dashboardResponse.status === 200) {
        console.log(`✓ Dashboard data retrieved`);
        console.log(`  Recent scans: ${dashboardResponse.body.recentScans.length}`);
        console.log(`  Top opportunities: ${dashboardResponse.body.topOpportunities.length}`);
        console.log(`  Signal stats: ${Object.keys(dashboardResponse.body.signalStats).length} signal types\n`);
      } else {
        console.log(`✗ Failed: ${JSON.stringify(dashboardResponse.body)}\n`);
      }

    } else {
      console.log(`✗ Failed to start scan: ${JSON.stringify(startResponse.body)}\n`);
    }

    console.log('=== API Tests Completed ===');

  } catch (error) {
    console.error('Test failed with error:', error);
    console.log('\nNote: Make sure the backend server is running on port 3000');
    console.log('Run: cd backend && npm run dev');
  }
}

// Run the test
testAPI().catch(console.error);