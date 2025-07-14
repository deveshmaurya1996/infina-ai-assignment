#!/usr/bin/env node

/**
 * Test Setup Script for Infina AI Assignment
 * 
 * This script verifies that all components are properly configured
 * and can be run successfully.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing Infina AI Assignment Setup...\n');

const tests = [
  {
    name: 'Problem 1 - macOS Audio Capture',
    checks: [
      () => fs.existsSync('problem-1-macos-system-audio/swift/audio_capture.swift'),
      () => fs.existsSync('problem-1-macos-system-audio/electron-integration/bridge.ts'),
      () => fs.existsSync('problem-1-macos-system-audio/electron-integration/package.json'),
      () => fs.existsSync('problem-1-macos-system-audio/README.md')
    ]
  },
  {
    name: 'Problem 2 - Browser Audio Separation',
    checks: [
      () => fs.existsSync('problem-2-browser-audio-separation/src/app.js'),
      () => fs.existsSync('problem-2-browser-audio-separation/public/index.html'),
      () => fs.existsSync('problem-2-browser-audio-separation/python/echo_cancellation.py'),
      () => fs.existsSync('problem-2-browser-audio-separation/package.json'),
      () => fs.existsSync('problem-2-browser-audio-separation/requirements.txt'),
      () => fs.existsSync('problem-2-browser-audio-separation/README.md')
    ]
  },
  {
    name: 'Problem 3 - Google Calendar UI',
    checks: [
      () => fs.existsSync('problem-3-google-calendar-ui/frontend/package.json'),
      () => fs.existsSync('problem-3-google-calendar-ui/frontend/src/App.tsx'),
      () => fs.existsSync('problem-3-google-calendar-ui/frontend/src/main.tsx'),
      () => fs.existsSync('problem-3-google-calendar-ui/README.md')
    ]
  },
  {
    name: 'Documentation & Diagrams',
    checks: [
      () => fs.existsSync('README.md'),
      () => fs.existsSync('problem-1-macos-system-audio/diagrams/architecture.drawio'),
      () => fs.existsSync('problem-2-browser-audio-separation/diagrams/signal_flow.excalidraw'),
      () => fs.existsSync('problem-3-google-calendar-ui/diagrams/system_architecture.svg')
    ]
  }
];

let totalTests = 0;
let passedTests = 0;

tests.forEach(test => {
  console.log(`📋 ${test.name}:`);
  
  test.checks.forEach((check, index) => {
    totalTests++;
    try {
      const result = check();
      if (result) {
        console.log(`  ✅ Check ${index + 1}: PASSED`);
        passedTests++;
      } else {
        console.log(`  ❌ Check ${index + 1}: FAILED`);
      }
    } catch (error) {
      console.log(`  ❌ Check ${index + 1}: ERROR - ${error.message}`);
    }
  });
  
  console.log('');
});

// Test Node.js version
console.log('🔧 Environment Checks:');
try {
  const nodeVersion = process.version;
  console.log(`  ✅ Node.js: ${nodeVersion}`);
  
  if (parseInt(nodeVersion.slice(1).split('.')[0]) >= 16) {
    console.log('  ✅ Node.js version is compatible (>=16)');
  } else {
    console.log('  ⚠️  Node.js version should be >=16 for optimal compatibility');
  }
} catch (error) {
  console.log(`  ❌ Node.js version check failed: ${error.message}`);
}

// Test Python availability
try {
  execSync('python --version', { stdio: 'pipe' });
  console.log('  ✅ Python is available');
} catch (error) {
  console.log('  ⚠️  Python not found - required for Problem 2 Python script');
}

// Test Swift availability (macOS only)
if (process.platform === 'darwin') {
  try {
    execSync('swift --version', { stdio: 'pipe' });
    console.log('  ✅ Swift is available (macOS)');
  } catch (error) {
    console.log('  ⚠️  Swift not found - required for Problem 1 on macOS');
  }
} else {
  console.log('  ℹ️  Swift check skipped (not macOS)');
}

console.log('\n📊 Test Summary:');
console.log(`  Total Tests: ${totalTests}`);
console.log(`  Passed: ${passedTests}`);
console.log(`  Failed: ${totalTests - passedTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed! The project is properly configured.');
  console.log('\n🚀 Next Steps:');
  console.log('  1. cd problem-1-macos-system-audio/electron-integration && npm install');
  console.log('  2. cd problem-2-browser-audio-separation && pip install -r requirements.txt');
  console.log('  3. cd problem-3-google-calendar-ui/frontend && npm install');
  console.log('  4. Follow the README files for detailed setup instructions');
} else {
  console.log('\n⚠️  Some tests failed. Please check the missing files and configurations.');
  process.exit(1);
} 