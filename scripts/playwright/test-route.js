const { chromium } = require('playwright');

async function testRoute(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`http://localhost:5175${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const title = await page.title();
    const h1 = await page.locator('h1').first().textContent().catch(() => 'N/A');
    const is404 = await page.locator('text=Page not found').isVisible().catch(() => false);

    console.log(`\n📍 Route: ${url}`);
    console.log(`   Title: ${title}`);
    console.log(`   H1: ${h1}`);
    console.log(`   404 visible: ${is404}`);

    return !is404;
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log('Testing routes...');
  const routes = ['/', '/templates', '/templates-test', '/projects', '/collect'];

  for (const route of routes) {
    await testRoute(route);
  }
})().catch(console.error);
