# CLAUDE.md — PR-Please

This file provides context for Claude Code when working on this repository.

@.claude/rules.md

## Project Overview

PR-Please is a Chrome extension that generates GitHub Pull Request titles and descriptions using an LLM. It injects a "Generate with AI" button into GitHub's PR creation and edit pages and calls the provider API directly from the browser — no backend required. Supported providers: Google Gemini, OpenAI, Anthropic, and Ollama (local).

## Architecture

Chrome Extension (Manifest V3, TypeScript, Vite). Each of the three extension contexts (service worker, content script, popup) has a thin entry file that wires together focused modules in a sibling folder.

### Entry points

- `src/background.ts` — Service worker. Fetches PR diffs, constructs the prompt, calls the active provider, streams chunks back over a long-lived port. Also owns cost/token-usage tracking.
- `src/content.ts` — Content script entry (~11 lines). Injects styles, starts the DOM observer, registers the message listener. All logic lives in `src/content/*`.
- `src/popup.ts` — Popup entry (~57 lines). Loads settings, wires onboarding + settings form + redact controls + import/export. All logic lives in `src/popup/*`.

### Shared modules

- `src/utils.ts` — Settings types, `chrome.storage` helpers, API-key XOR-obfuscation.
- `src/costs.ts` — Per-model input/output token pricing and cost estimation.
- `manifest.json` (repo root) — Manifest with CSP, permissions, content script registration. Consumed by `@crxjs/vite-plugin` which rewrites source paths into built assets.
- `public/icons/` — Static icons copied verbatim into `dist/`.

### Providers (`src/providers/`)

One file per provider, each exporting a `Provider` object with `generate()` and `stream()` methods.

- `types.ts` — `Provider`, `ProviderSettings`, `TokenUsage`, `Generation` types plus shared helpers: `parseJsonResponse`, `readSseLines`, `readLines`, `requireBody`, `trimBaseUrl`.
- `gemini.ts`, `openai.ts`, `anthropic.ts`, `ollama.ts` — Provider implementations. Gemini uses `@google/generative-ai`; the others are plain `fetch` against REST/SSE endpoints.
- `index.ts` — `PROVIDERS` registry, `ProviderId` union, `isProviderId` guard, `DEFAULT_PROVIDER`.

### Content script modules (`src/content/`)

- `dom.ts` — Generic `el<K extends keyof HTMLElementTagNameMap>()` helper.
- `icons.ts` — SVG icon factory (`icon()`, `createSpinnerIcon()`).
- `styles.ts` — `INJECTED_STYLES` constant and `injectStylesheet()`.
- `inject.ts` — `injectButton`, `startInjectionObserver` (debounced MutationObserver), wrappers for create-PR and edit-PR forms.
- `page-state.ts` — Reads/writes GitHub's title + body inputs, detects existing-PR vs compare pages, persists extra-context per repo.
- `json-parse.ts` — Tolerant parser for the streamed JSON generation payload with partial-description extraction.
- `generation.ts` — Orchestrates a generate run: opens a `prp-stream` port to the service worker, updates the preview modal as chunks arrive, handles done/error.
- `preview-modal.ts` — Preview + regenerate UI with variation navigation.
- `settings-modal.ts` — In-page settings modal (mirror of the popup form).

### Popup modules (`src/popup/`)

- `elements.ts` — `PopupElements` interface + `getPopupElements()` that resolves every DOM node once.
- `star.ts` — GitHub star-count fetch with TTL cache.
- `onboarding.ts` — Multi-step first-run wizard (provider → API key → done, or → Ollama instructions).
- `settings-form.ts` — Provider/endpoint/model/API-key/redact form, per-provider rendering, save handler.
- `redact.ts` — Redaction-patterns chip UI; returns a `RedactController { get, replace }`.
- `import-export.ts` — Settings JSON export and validated import.

## Build & Run

```bash
npm install
npm run build    # tsc --noEmit + production vite build into dist/
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

## Lint & Format

```bash
npm run lint          # ESLint with @typescript-eslint (size/complexity rules from .claude/rules.md)
npm run lint:fix
npm run format        # Prettier write
npm run format:check
```

## Key Patterns

- **No `innerHTML`** — All DOM construction in `src/content/*` uses `createElement`/`textContent`/`appendChild` via the `el()` helper. Security invariant — never bypass.
- **API key obfuscation** — Keys are XOR + base64 encoded before storage in `chrome.storage.local` via `obfuscateApiKey()`/`deobfuscateApiKey()` in `src/utils.ts`.
- **Debounced MutationObserver** — `startInjectionObserver()` in `src/content/inject.ts` uses a debounce (see `OBSERVER_DEBOUNCE_MS`) to avoid excessive re-runs.
- **Streaming over a Port** — `generation.ts` opens a `chrome.runtime.connect({ name: 'prp-stream' })` port; the service worker streams provider chunks back as typed `StreamMsg` messages.
- **No non-null assertions** — Use `requireBody()` for response bodies and type guards where nullable inputs must be narrowed.

## Security

- Manifest has explicit CSP: `script-src 'self'; object-src 'none'`
- Only `storage` and `activeTab` permissions (no `scripting`)
- Host permissions scoped to GitHub PR pages and the four provider API origins
- No external resource loading (no CDN fonts, no remote scripts)

## Common Tasks

- **Adding a new setting** — Extend `StoredSettings` in `src/utils.ts`, update the popup form in `src/popup/settings-form.ts` and the in-page modal in `src/content/settings-modal.ts`, and read it wherever needed (typically `src/background.ts`).
- **Changing the LLM prompt** — Edit `constructPrompt()` and the `buildPromptSections()` helpers in `src/background.ts`.
- **Adding a new provider** — Create `src/providers/<name>.ts` implementing the `Provider` interface from `types.ts`, register it in `src/providers/index.ts`, add pricing to `src/costs.ts`, and add provider-specific UI hints in `src/popup/onboarding.ts` if needed.
- **Modifying injected UI** — Touch the relevant file under `src/content/`. All elements are built with `el()` from `dom.ts` and `icon()` from `icons.ts`. Styles live in `INJECTED_STYLES` in `styles.ts`.

## Code rules

All `src/` files follow the limits in [`.claude/rules.md`](.claude/rules.md): max 500 lines/file, 60 lines/function, 4 levels of nesting, 4 parameters, 100 char lines, no unexplained `any` or non-null assertions. Enforced by ESLint.

## Environment

- TypeScript, Vite, Chrome APIs (`chrome.storage`, `chrome.runtime`, `chrome.commands`)
- `@google/generative-ai` SDK for Gemini; plain `fetch` for OpenAI, Anthropic, Ollama
- Vitest + `vitest-environment-web-ext` for e2e tests
