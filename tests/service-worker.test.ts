import { describe, it, expect } from 'vitest';

describe('service worker', () => {
  it('registers and exposes the extension id', async () => {
    const id = await browser.getExtensionId();
    expect(id).toMatch(/^[a-p]{32}$/);
  });

  it('surfaces a clear error when GENERATE_PR is invoked without an API key', async () => {
    const sw = await browser.getServiceWorker();
    await sw.evaluate(() => chrome.storage.local.clear());

    const response = await sw.evaluate(
      () => new Promise<{ error?: string; title?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: 'GENERATE_PR',
            commits: ['feat: add thing'],
            // Use a URL that returns something harmless; the background only
            // reads the diff text, and we expect the handler to short-circuit
            // on the missing API key before even needing a valid diff host.
            prUrl: 'https://raw.githubusercontent.com/github/docs/main/README.md',
          },
          resolve
        );
      })
    );

    expect(response.error).toBeTruthy();
    expect(response.error).toMatch(/api key/i);
    expect(response.title).toBeUndefined();
  });
});
