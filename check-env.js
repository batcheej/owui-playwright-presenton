#!/usr/bin/env node

// Environment Configuration Checker
// Run with: node check-env.js

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('🔧 OWUI-Playwright-Presenton Environment Checker');
console.log('================================================');
console.log('');

// Load environment variables
dotenv.config();

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);
const envExamplePath = path.join(process.cwd(), '.env.example');
const envExampleExists = fs.existsSync(envExamplePath);

console.log('📁 File Status:');
console.log(`   .env file: ${envExists ? '✅ Found' : '❌ Missing'}`);
console.log(`   .env.example: ${envExampleExists ? '✅ Found' : '❌ Missing'}`);
console.log('');

if (!envExists && envExampleExists) {
  console.log('🚨 ACTION REQUIRED:');
  console.log('   Run: cp .env.example .env');
  console.log('   Then edit .env with your credentials');
  console.log('');
}

// Check environment variables
const config = {
  'OPENWEBUI_URL': process.env.OPENWEBUI_URL || 'http://localhost:8080 (default)',
  'OPENWEBUI_EMAIL': process.env.OPENWEBUI_EMAIL || '❌ Not set',
  'OPENWEBUI_USERNAME': process.env.OPENWEBUI_USERNAME || '❌ Not set',
  'OPENWEBUI_PASSWORD': process.env.OPENWEBUI_PASSWORD ? '✅ Set (hidden)' : '❌ Not set',
  'PRESENTON_URL': process.env.PRESENTON_URL || 'http://localhost:5000 (default)',
  'HEADLESS': process.env.HEADLESS || 'false (default)',
  'DEBUG': process.env.DEBUG || 'true (default)'
};

console.log('⚙️  Environment Variables:');
Object.entries(config).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});
console.log('');

// Check credentials
const hasEmail = !!process.env.OPENWEBUI_EMAIL;
const hasUsername = !!process.env.OPENWEBUI_USERNAME;
const hasPassword = !!process.env.OPENWEBUI_PASSWORD;
const hasCredentials = (hasEmail || hasUsername) && hasPassword;

console.log('🔐 Credential Status:');
console.log(`   Username/Email: ${hasCredentials ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Password: ${hasPassword ? '✅ Configured' : '❌ Missing'}`);
console.log('');

// Check WSL
const isWSL = process.platform === 'linux' && process.env.WSL_DISTRO_NAME;
if (isWSL) {
  console.log('🐧 WSL Environment Detected');
  console.log('   Consider using Windows host IP for services running on Windows');
  console.log('   Example: OPENWEBUI_URL=http://172.20.208.1:8080');
  console.log('');
}

// Recommendations
console.log('💡 Recommendations:');

if (!hasCredentials) {
  console.log('   ❌ Set up Open WebUI credentials in .env file');
}

if (!envExists) {
  console.log('   ❌ Create .env file from .env.example');
}

if (hasCredentials && envExists) {
  console.log('   ✅ Configuration looks good!');
  console.log('   🚀 Ready to run: npm run dev "your prompt here"');
}

console.log('');
console.log('📚 For more help:');
console.log('   - Check README.md for general setup');
console.log('   - Check WSL-SETUP.md for WSL-specific instructions');
console.log('   - Run with DEBUG=true for detailed logs');