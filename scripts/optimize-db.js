#!/usr/bin/env node

// Script to run database optimizations
// Usage: node scripts/optimize-db.js

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error('❌ JWT_SECRET environment variable is required');
  console.log('Please set it: export JWT_SECRET=your-secret-key');
  process.exit(1);
}

const url = new URL('/api/db/optimize', baseUrl);
const protocol = url.protocol === 'https:' ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtSecret}`,
    'Content-Type': 'application/json'
  }
};

console.log('🚀 Running database optimizations...');
console.log(`📍 Target: ${baseUrl}`);

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('\n✅ Optimization completed successfully!\n');
        
        // Display results
        if (result.results) {
          console.log('Results:');
          result.results.forEach(r => console.log(`  ${r}`));
        }
        
        // Display summary
        if (result.summary) {
          console.log('\nSummary:');
          console.log(`  Total operations: ${result.summary.total}`);
          console.log(`  Successful: ${result.summary.successful}`);
          console.log(`  Failed: ${result.summary.failed}`);
          console.log(`  Warnings: ${result.summary.warnings}`);
        }
        
        // Display recommendations
        if (result.recommendations) {
          console.log('\nRecommendations:');
          result.recommendations.forEach(r => console.log(`  • ${r}`));
        }
      } else {
        console.error(`\n❌ Optimization failed with status ${res.statusCode}`);
        console.error(result.error || result);
      }
    } catch (e) {
      console.error('\n❌ Failed to parse response:', e.message);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.log('Make sure the application is running at', baseUrl);
  }
});

req.end();