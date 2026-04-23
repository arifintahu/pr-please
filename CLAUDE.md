# CLAUDE.md — PR-Please

This file provides context for Claude Code when working on this repository.

## Project Overview

PR-Please is a Chrome extension that generates GitHub Pull Request titles and descriptions using Google Gemini AI. It injects a "Generate with AI" button into GitHub's PR creation page and calls the Gemini API directly from the browser — no backend required.

## Architecture

Chrome Extension (Manifest V3, TypeScript, Vite) — all source is at the repo root.

- `src/background.ts` — Service worker: fetches PR diffs, calls the Gemini API directly.
- `src/content.ts` — Content script: injects UI into GitHub PR pages, handles user interactions, in-page settings modal.
- `src/popup.ts` — Extension popup: settings management (API key, model, optional base URL).
- `src/popup.html` / `src/popup.css` — Popup markup and styles.
- `src/utils.ts` — Shared constants and API-key obfuscation helpers.
- `manifest.json` (repo root) — Extension manifest with CSP, permissions, content script registration. Consumed by `@crxjs/vite-plugin` which rewrites source paths (`src/background.ts`, `src/content.ts`, `src/popup.html`) into built assets.
- `public/icons/` — Static icons copied verbatim into `dist/`.

## Build & Run

```bash
npm install
npm run build    # one-shot production build into dist/
npm run dev      # Vite dev server with HMR for popup + content script
```

Load `dist/` as an unpacked extension in Chrome. `npm run dev` writes to `dist/` continuously and enables HMR for popup/content — reload the extension in `chrome://extensions` once, then most source edits hot-reload automatically. Background service worker edits still require a manual extension reload.

## Testing

End-to-end tests use [`vitest-environment-web-ext`](https://github.com/crxjs/vitest-environment-web-ext) — Vitest + Playwright launching a real Chromium with the extension loaded.

```bash
npm test          # builds dist/, then runs all e2e tests
npm run test:watch
```

Test layout:
- `tests/popup.test.ts` — opens the popup via `browser.getPopupPage()`, exercises the form, verifies settings are persisted to `chrome.storage.local` with the key obfuscated.
- `tests/content.test.ts` — intercepts `https://github.com/**` with `context.route()` to serve a mock PR page from `tests/fixtures/github-pr.html`, then asserts the content script injects the Generate button and the in-page settings modal.
- `tests/service-worker.test.ts` — smoke-tests the service worker via `browser.getServiceWorker()` and `sw.evaluate(() => chrome.runtime.sendMessage(...))`.

Vitest is configured to build `dist/` once before tests (`compiler: false` in `vitest.config.ts`, build chained from the `test` script) and to run all files in a single fork so they share one Chromium instance.

Global injected by the environment: `browser: WebExtBrowser` and `context: playwright.BrowserContext`. Type declarations come via `tests/env.d.ts`.

## Key Patterns

- **No `innerHTML`** — All DOM construction in `content.ts` uses `createElement`/`textContent`/`appendChild`. This is intentional for security. Do not introduce `innerHTML`.
- **API key obfuscation** — Keys are XOR + base64 encoded before storage in `chrome.storage.local` via `obfuscateApiKey()`/`deobfuscateApiKey()`. These live in `src/utils.ts` and are imported by the contexts that need them.
- **Debounced MutationObserver** — The content script's DOM observer uses a 200ms debounce to avoid excessive re-runs.

## Security

- Manifest has explicit CSP: `script-src 'self'; object-src 'none'`
- Only `storage` and `activeTab` permissions (no `scripting`)
- Host permissions scoped to `github.com/*/*/pull/*`, `github.com/*/*/compare/*`, and `generativelanguage.googleapis.com/v1beta/models/*`
- No external resource loading (no CDN fonts, no remote scripts)

## Common Tasks

- **Adding a new setting** — Update the `Settings` interface in `background.ts` and `popup.ts`, add to `chrome.storage.local.get()`/`.set()` calls, and add UI in both `popup.html`/`popup.ts` (popup) and `content.ts` (in-page modal).
- **Changing the LLM prompt** — Edit `constructPrompt()` in `src/background.ts`.
- **Modifying injected UI** — Edit `src/content.ts`. All UI elements are built with the `el()` helper and `icon()` function. Styles are in the `INJECTED_STYLES` constant.

## Environment

- TypeScript, Vite, Chrome APIs (`chrome.storage`, `chrome.runtime`)
- `@google/generative-ai` SDK for Gemini calls
- No test framework is currently configured
