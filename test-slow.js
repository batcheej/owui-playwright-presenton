#!/usr/bin/env node

// Test script for slower environments (WSL, older hardware, etc.)
// Run with: npm run test-slow "your prompt here"

const { exec } = require('child_process');
const path = require('path');

console.log('🐌 Running automation with slower environment settings...');
console.log('================================================');

// Enhanced environment variables for slower systems
const slowEnvVars = {
  'OPENWEBUI_LOAD_TIMEOUT': '60000',     // 60 seconds for page load
  'CHAT_INTERFACE_TIMEOUT': '30000',     // 30 seconds for chat interface
  'MESSAGE_SEND_TIMEOUT': '10000',       // 10 seconds for message sending
  'BROWSER_TIMEOUT': '600000',           // 10 minutes browser timeout
  'BUTTON_WAIT_TIMEOUT': '1200000',      // 20 minutes for button wait
  'RESPONSE_WAIT_TIMEOUT': '300000',     // 5 minutes for response
  'HEADLESS': 'false',                   // Keep visible for debugging
  'DEBUG': 'true'                        // Enable debug output
};

// Get the prompt from command line arguments
const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
  console.log('❌ Please provide a prompt:');
  console.log('   npm run test-slow "Create a presentation about AI with 5 slides"');
  process.exit(1);
}

console.log(`📝 Prompt: ${prompt}`);
console.log('🔧 Using enhanced timeouts for slower environments:');
Object.entries(slowEnvVars).forEach(([key, value]) => {
  console.log(`   ${key}=${value}`);
});
console.log('');

// Prepare environment variables string
const envString = Object.entries(slowEnvVars)
  .map(([key, value]) => `${key}=${value}`)
  .join(' ');

// Run the automation with enhanced settings
const command = `${envString} npx ts-node src/index.ts "${prompt}"`;

console.log('🚀 Starting automation with slow environment settings...');
console.log('');

exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Automation failed:');
    console.log(error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.log('⚠️ Warnings:');
    console.log(stderr);
  }
  
  console.log(stdout);
  console.log('✅ Automation completed!');
});