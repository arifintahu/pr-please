import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixtureHtml = readFileSync(resolve(__dirname, 'fixtures/github-pr.html'), 'utf8');

describe('content script', () => {
  it('injects the Generate button on a GitHub PR page', async () => {
    // Intercept github.com and return our mock PR page. The content script's
    // match pattern is `https://github.com/*`, so Chrome still treats the
    // document URL as github.com and injects the content script.
    await context.route('https://github.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fixtureHtml,
      });
    });

    const page = await context.newPage();
    await page.goto('https://github.com/example/repo/compare/main...feature');

    await page.waitForSelector('#pr-please-wrapper', { timeout: 10_000 });
    await page.waitForSelector('#prp-generate-btn');
    await page.waitForSelector('#prp-settings-btn');

    const btnText = await page.textContent('#prp-generate-btn');
    expect(btnText).toMatch(/Generate with AI/);

    await page.close();
  });

  it('opens the in-page settings modal when the gear button is clicked', async () => {
    await context.route('https://github.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fixtureHtml,
      });
    });

    const page = await context.newPage();
    await page.goto('https://github.com/example/repo/pull/1');

    await page.waitForSelector('#prp-settings-btn', { timeout: 10_000 });
    await page.click('#prp-settings-btn');

    await page.waitForSelector('#prp-settings-modal');
    await page.waitForSelector('#prp-api-key');
    await page.waitForSelector('#prp-model-select');
    await page.waitForSelector('#prp-base-url');

    await page.close();
  });
});
