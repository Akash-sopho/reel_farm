const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureMyProjects() {
  const outputDir = path.join(__dirname, 'output');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(outputDir, 'myprojects-full.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Get the full HTML
    const html = await page.content();
    const htmlPath = path.join(outputDir, 'myprojects-dom.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML saved: ${htmlPath}`);

    // Extract main content
    const mainContent = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.innerHTML.substring(0, 1000) : 'No main element found';
    });

    console.log(`\n📍 Main Content (first 1000 chars):`);
    console.log(mainContent);

    // Check API call
    const apiTest = await fetch('http://localhost:3001/api/projects').then(r => r.json());
    console.log(`\n✅ Backend /api/projects returns ${apiTest.data.length} projects`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

captureMyProjects().catch(console.error);
