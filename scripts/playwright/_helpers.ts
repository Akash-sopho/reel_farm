import { chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const OUTPUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export interface BrowserSession {
  browser: Browser;
  page: Page;
  consoleLogs: string[];
  pageErrors: string[];
}

export async function openBrowser(headless = true): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    pageErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  return { browser, page, consoleLogs, pageErrors };
}

export async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export function writeOutput(name: string, data: object | string): void {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.txt`), content);
}

export async function closeBrowser(session: BrowserSession): Promise<void> {
  writeOutput('console', [...session.consoleLogs, ...session.pageErrors].join('\n') || '(no console output)');
  await session.browser.close();
}
