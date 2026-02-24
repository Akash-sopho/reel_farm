const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5176/my-projects-list', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const content = await page.locator('main').innerText();
    const is404 = content.includes('Page not found');

    console.log(`Testing /my-projects-list:`);
    console.log(`  404 visible: ${is404}`);
    console.log(`  Content preview: ${content.substring(0, 100)}...`);
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
