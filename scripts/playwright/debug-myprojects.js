const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugMyProjects() {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  // Capture all console messages including errors
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.error(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
    });
    console.error(`[PAGE ERROR] ${error.message}`);
  });

  try {
    console.log('🔍 Navigating to /projects...');
    await page.goto('http://localhost:5175/projects', {
      waitUntil: 'networkidle',
    });

    console.log('⏳ Waiting 3 seconds for any errors...');
    await page.waitForTimeout(3000);

    // Check DOM for error indicators
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);

    // Try to find the MyProjects component by looking for specific text
    const hasMyProjectsHeader = await page.locator('text=My Projects').isVisible().catch(() => false);
    const hasNotFound = await page.locator('text=Page not found').isVisible().catch(() => false);

    console.log(`\n📋 DOM Check:`);
    console.log(`  - "My Projects" header visible: ${hasMyProjectsHeader}`);
    console.log(`  - "Page not found" text visible: ${hasNotFound}`);

    // Check if component mounted by looking for specific class from MyProjects
    const hasProjectGrid = bodyHTML.includes('grid-cols');
    console.log(`  - Project grid present: ${hasProjectGrid}`);

    // Get all errors from the page
    console.log(`\n📊 Error Summary:`);
    console.log(`  - Console warnings/errors: ${consoleLogs.filter(l => l.type === 'warning' || l.type === 'error').length}`);
    console.log(`  - Page errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.log(`\n❌ Page Errors:`);
      pageErrors.forEach((err) => {
        console.log(`   ${err.message}`);
      });
    }

    // Log last 20 console messages
    console.log(`\n💬 Last Console Messages (${consoleLogs.length} total):`);
    consoleLogs.slice(-20).forEach((log) => {
      console.log(`[${log.type.toUpperCase()}] ${log.text.substring(0, 120)}`);
    });

    // Write full report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      checks: {
        myProjectsHeaderVisible: hasMyProjectsHeader,
        notFoundVisible: hasNotFound,
        projectGridPresent: hasProjectGrid,
      },
      errors: pageErrors,
      warnings: consoleLogs.filter(l => l.type === 'warning'),
      consoleLogs: consoleLogs.slice(-50),
    };

    const reportPath = path.join(outputDir, 'debug-myprojects.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report: ${reportPath}`);
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugMyProjects().catch(console.error);
