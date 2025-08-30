// Simple health check for Docker container
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Success
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error(`Health check request failed: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check request timed out');
  req.destroy();
  process.exit(1);
});

req.end();