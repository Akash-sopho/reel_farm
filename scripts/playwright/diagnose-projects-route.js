const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function diagnoseProjectsRoute() {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleLogs = [];
  const networkRequests = [];
  const pageErrors = [];

  // Capture console messages
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: msg.args().length,
    });
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
    });
  });

  // Capture network requests
  page.on('response', (response) => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    });
  });

  try {
    console.log('🔍 Navigating to /projects...');
    const response = await page.goto('http://localhost:5175/projects', {
      waitUntil: 'networkidle',
    });

    console.log(`✅ Navigation response: ${response?.status()}`);

    // Wait a moment for any errors to surface
    await page.waitForTimeout(2000);

    // Get the current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check if we're on the NotFound page
    const notFoundText = await page
      .locator('text=Page not found')
      .isVisible()
      .catch(() => false);
    console.log(`❌ NotFound page visible: ${notFoundText}`);

    // Try to detect the rendered element
    const rootElement = await page.locator('#root').evaluate((el) => {
      return {
        innerHTML: el.innerHTML.substring(0, 500),
        className: el.className,
      };
    });

    // Get detailed info about loaded modules
    const moduleInfo = await page.evaluate(() => {
      return {
        windowKeys: Object.keys(window).filter(
          (k) => k.includes('react') || k.includes('router') || k.includes('app')
        ),
        documentTitle: document.title,
        bodyHTML: document.body.innerHTML.substring(0, 300),
      };
    });

    // Capture screenshot
    const screenshotPath = path.join(outputDir, 'diagnose-projects-route.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot: ${screenshotPath}`);

    // Write diagnostic report
    const report = {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      statusCode: response?.status(),
      notFoundPageVisible: notFoundText,
      consoleLogs: consoleLogs.slice(-20), // Last 20 logs
      pageErrors,
      networkRequests: networkRequests.slice(-20), // Last 20 requests
      rootElement,
      moduleInfo,
      diagnosis: {
        routeMatched: !notFoundText,
        possibleIssues: [
          notFoundText
            ? 'React Router is matching the wildcard * route instead of /projects'
            : 'Route matched correctly',
          consoleLogs.length === 0 ? 'No console output detected' : 'Console is logging',
          pageErrors.length > 0
            ? `${pageErrors.length} JavaScript errors detected`
            : 'No JS errors',
          networkRequests.filter((r) => r.status >= 400).length > 0
            ? 'Network errors detected'
            : 'All network requests successful',
        ],
      },
    };

    const reportPath = path.join(outputDir, 'diagnose-projects-route.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Report saved: ${reportPath}`);

    // Print summary
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log(`Current URL: ${currentUrl}`);
    console.log(`NotFound page visible: ${notFoundText}`);
    console.log(`Console logs: ${consoleLogs.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`Network requests: ${networkRequests.length}`);
    console.log(`Failed network requests: ${networkRequests.filter((r) => r.status >= 400).length}`);
    console.log('\n=== RECENT CONSOLE LOGS ===');
    consoleLogs.slice(-5).forEach((log) => {
      console.log(`[${log.type}] ${log.text}`);
    });

    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach((err) => {
        console.log(`${err.message}`);
      });
    }

    console.log('\n=== NETWORK REQUESTS (last 10) ===');
    networkRequests.slice(-10).forEach((req) => {
      console.log(`${req.status} ${req.url}`);
    });
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await browser.close();
  }
}

diagnoseProjectsRoute().catch(console.error);
