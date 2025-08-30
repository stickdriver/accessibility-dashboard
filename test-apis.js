const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123';
const TEST_NAME = 'Test User';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing User Management APIs\n');
  
  try {
    // Test 1: User Registration
    console.log('1. Testing user registration...');
    const registerResponse = await makeRequest('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME
    });
    
    console.log(`   Status: ${registerResponse.status}`);
    console.log(`   Success: ${registerResponse.data.success}`);
    console.log(`   Message: ${registerResponse.data.message}`);
    
    if (!registerResponse.data.success) {
      console.log(`   Error: ${registerResponse.data.error}`);
      if (registerResponse.data.error.includes('User already exists')) {
        console.log('   Note: User already exists, proceeding with login test');
      } else {
        throw new Error('Registration failed');
      }
    }
    
    // Test 2: User Login
    console.log('\n2. Testing user login...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Success: ${loginResponse.data.success}`);
    console.log(`   Message: ${loginResponse.data.message}`);
    
    if (!loginResponse.data.success) {
      console.log(`   Error: ${loginResponse.data.error}`);
      throw new Error('Login failed');
    }
    
    const authToken = loginResponse.data.data?.token;
    console.log(`   Token received: ${authToken ? 'Yes' : 'No'}`);
    
    if (!authToken) {
      throw new Error('No auth token received');
    }
    
    // Test 3: Get User Profile
    console.log('\n3. Testing get user profile...');
    const profileResponse = await makeRequest('GET', '/api/users/profile');
    profileResponse.headers = { ...profileResponse.headers, 'Authorization': `Bearer ${authToken}` };
    
    console.log(`   Status: ${profileResponse.status}`);
    console.log(`   Success: ${profileResponse.data.success}`);
    
    if (profileResponse.data.success) {
      const userData = profileResponse.data.data;
      console.log(`   User ID: ${userData.id}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Plan: ${userData.planType}`);
    } else {
      console.log(`   Error: ${profileResponse.data.error}`);
    }
    
    // Test 4: Password Reset Request
    console.log('\n4. Testing password reset request...');
    const resetRequestResponse = await makeRequest('POST', '/api/auth/forgot-password', {
      email: TEST_EMAIL
    });
    
    console.log(`   Status: ${resetRequestResponse.status}`);
    console.log(`   Success: ${resetRequestResponse.data.success}`);
    console.log(`   Message: ${resetRequestResponse.data.message}`);
    
    console.log('\n✅ API Testing Complete!');
    console.log('\nNote: Make sure your development server is running on http://localhost:3000');
    console.log('Run: npm run dev');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. Your development server is running (npm run dev)');
    console.log('2. Convex is properly configured and running');
    console.log('3. Environment variables are set correctly');
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest };