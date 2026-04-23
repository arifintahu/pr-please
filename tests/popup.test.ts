import { describe, it, expect, beforeEach } from 'vitest';

describe('popup', () => {
  beforeEach(async () => {
    const sw = await browser.getServiceWorker();
    await sw.evaluate(() => chrome.storage.local.clear());
  });

  it('renders the settings form', async () => {
    const page = await browser.getPopupPage();
    await expect.poll(() => page.title()).toBe('PR-Please Settings');

    await page.waitForSelector('#apiKey');
    await page.waitForSelector('#modelSelect');
    await page.waitForSelector('#baseUrl');
    await page.waitForSelector('#saveBtn');

    const modelOptions = await page.$$eval('#modelSelect option', opts => opts.length);
    expect(modelOptions).toBeGreaterThan(0);
  });

  it('persists settings to chrome.storage with the key obfuscated', async () => {
    const page = await browser.getPopupPage();
    await page.waitForSelector('#apiKey');

    const rawKey = 'test-api-key-123';
    await page.fill('#apiKey', rawKey);
    await page.click('#saveBtn');

    await expect.poll(() => page.textContent('#statusText')).toMatch(/saved/i);

    const sw = await browser.getServiceWorker();
    const stored = await sw.evaluate(
      () => new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage.local.get(['apiKeyEncoded', 'baseUrl', 'model'], resolve);
      })
    );

    expect(stored.apiKeyEncoded).toBeTruthy();
    expect(stored.apiKeyEncoded).not.toBe(rawKey);
    expect(stored.model).toBeTruthy();
    expect(stored.baseUrl).toMatch(/^https?:\/\//);
  });

  it('shows an error when saving without an API key', async () => {
    const page = await browser.getPopupPage();
    await page.waitForSelector('#apiKey');
    await page.fill('#apiKey', '');
    await page.click('#saveBtn');

    await expect.poll(() => page.textContent('#statusText')).toMatch(/api key/i);
    const isError = await page.$eval('#statusRow', el => el.classList.contains('error'));
    expect(isError).toBe(true);
  });
});
