const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function verifyHTT00() {
  console.log('🔍 Starting H-T00 verification...\n');

  let browser;
  let frontendLoaded = false;
  let backendHealthy = false;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      pageErrors.push(`[PAGE ERROR] ${err.message}`);
    });

    // Step 1: Navigate to frontend
    console.log('📍 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 10000 });

    // Step 2: Check for ReelForge title or h1
    console.log('✓ Page loaded.');
    const title = await page.title();
    const h1Element = await page.locator('h1').first();
    let h1Text = '';
    try {
      h1Text = await h1Element.textContent();
    } catch (e) {
      h1Text = '';
    }

    console.log(`  Title: "${title}"`);
    console.log(`  H1: "${h1Text}"`);

    if (title.toLowerCase().includes('reelforge') || (h1Text && h1Text.toLowerCase().includes('reelforge'))) {
      frontendLoaded = true;
      console.log('✓ Frontend loaded successfully (ReelForge found).\n');
    } else {
      console.log('✗ Frontend loaded but ReelForge not found in title/h1.\n');
    }

    // Step 3: Check backend health endpoint
    console.log('📍 Checking backend health endpoint (http://localhost:3001/health)...');
    const healthResponse = await page.context().request.get('http://localhost:3001/health');
    const healthStatus = healthResponse.status();
    console.log(`  Status: ${healthStatus}`);

    if (healthStatus === 200) {
      backendHealthy = true;
      console.log('✓ Backend is healthy.\n');
    } else {
      console.log(`✗ Backend returned status ${healthStatus}.\n`);
    }

    // Step 4: Screenshot homepage
    console.log('📸 Capturing screenshot...');
    const screenshotPath = path.join(OUTPUT_DIR, 'h-t00-homepage.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved to ${screenshotPath}\n`);

    // Write console logs
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'console.txt'),
      [...consoleLogs, ...pageErrors].join('\n') || '(no console output)'
    );

    await context.close();
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Step 5: Write results
  const result = {
    frontendLoaded,
    backendHealthy,
    timestamp: new Date().toISOString(),
    summary: frontendLoaded && backendHealthy ? 'PASS' : 'FAIL',
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'h-t00-result.txt'),
    JSON.stringify(result, null, 2)
  );

  console.log('📊 Results written to output/h-t00-result.txt');
  console.log(`\n${JSON.stringify(result, null, 2)}`);
}

verifyHTT00().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
