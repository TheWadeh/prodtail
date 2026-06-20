#!/usr/bin/env -S node --experimental-strip-types
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { performScan } from '../src/scan.ts';
import { findReferences, analyzeRisk } from '../src/approve.ts';

const tempFixtureDir = path.resolve('./tests/fixtures-temp');

function setupFixtures() {
  fs.mkdirSync(tempFixtureDir, { recursive: true });
  fs.mkdirSync(path.join(tempFixtureDir, 'src'), { recursive: true });

  // 1. Create a committed env file (Security Violation)
  fs.writeFileSync(path.join(tempFixtureDir, '.env'), 'API_KEY=supersecret');

  // 2. Create a frontend file with hardcoded hex, inline styles, and env leak
  const componentContent = `
    import React from 'react';
    export const Button = () => {
      const key = "api-key: 'xyz1234567890123456'"; // Security
      const clientSecret = process.env.CLIENT_SECRET; // Security Leak
      const val = [1, 2].map(x => [3, 4].find(y => y === x)); // Performance (Nested Loop)
      return (
        <button style={{ color: '#FF5500' }}>Click Me</button> // Design & Hex color
      );
    };
  `;
  fs.writeFileSync(path.join(tempFixtureDir, 'src/Button.tsx'), componentContent);

  // 3. Create a duplicate file (Code Quality)
  fs.writeFileSync(path.join(tempFixtureDir, 'src/ButtonCopy.tsx'), componentContent);

  // 4. Create an SEO/AI deficit file
  fs.writeFileSync(path.join(tempFixtureDir, 'src/page.tsx'), `
    export default function Page() {
      return <div><h1>First Header</h1><h1>Second Header</h1></div>; // SEO (Multiple h1)
    }
  `);

  // 5. Create a package.json with deprecated dependency
  const pkg = {
    dependencies: {
      "moment": "^2.29.4",
      "react": "^18.2.0"
    }
  };
  fs.writeFileSync(path.join(tempFixtureDir, 'package.json'), JSON.stringify(pkg, null, 2));
}

function cleanupFixtures() {
  if (fs.existsSync(tempFixtureDir)) {
    fs.rmSync(tempFixtureDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('Setting up test fixtures...');
  setupFixtures();

  try {
    console.log('Running scan tests...');
    const result = performScan(tempFixtureDir);

    // Verify findings
    const securityFindings = result.findings.filter(f => f.category === 'Security');
    const designFindings = result.findings.filter(f => f.category === 'Design');
    const performanceFindings = result.findings.filter(f => f.category === 'Performance');
    const qualityFindings = result.findings.filter(f => f.category === 'Code Quality');
    const seoFindings = result.findings.filter(f => f.category === 'SEO & AI');
    const depFindings = result.findings.filter(f => f.category === 'Dependency');

    // Assertions
    assert.ok(securityFindings.length >= 2, 'Should detect at least 2 security issues (.env and leaked process.env)');
    assert.ok(designFindings.some(f => f.message.includes('Hardcoded hex')), 'Should detect hardcoded hex color');
    assert.ok(performanceFindings.some(f => f.message.includes('Nested iteration')), 'Should detect nested loop performance bottleneck');
    assert.ok(qualityFindings.some(f => f.message.includes('Duplicate file')), 'Should detect ButtonCopy.tsx as duplicate');
    assert.ok(seoFindings.some(f => f.message.includes('Multiple <h1>')), 'Should detect multiple H1 tags');
    assert.ok(depFindings.some(f => f.message.includes('Deprecated')), 'Should detect deprecated moment package');

    console.log('✔ Scan assertions passed successfully.');

    // Reference & Risk analysis tests
    const allFiles = [
      path.join(tempFixtureDir, 'src/Button.tsx'),
      path.join(tempFixtureDir, 'src/ButtonCopy.tsx'),
      path.join(tempFixtureDir, 'src/page.tsx')
    ];

    const refsForButton = findReferences(path.join(tempFixtureDir, 'src/Button.tsx'), allFiles, tempFixtureDir);
    // Button is not imported by ButtonCopy or page, so it should have 0 refs
    assert.strictEqual(refsForButton.length, 0, 'Button.tsx should have 0 imports');

    const riskAssessment = analyzeRisk(path.join(tempFixtureDir, 'src/Button.tsx'), refsForButton, tempFixtureDir);
    assert.strictEqual(riskAssessment.risk, 'SAFE', 'Unreferenced Button should be classified as SAFE to delete');

    console.log('✔ Risk assessment assertions passed successfully.');
    console.log('\n\x1b[32;1mAll self-checks passed successfully!\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31;1mSelf-check failed:\x1b[0m', err);
    process.exit(1);
  } finally {
    console.log('Cleaning up test fixtures...');
    cleanupFixtures();
  }
}

runTests();
