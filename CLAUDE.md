# CLAUDE.md — PR-Please

This file provides context for Claude Code when working on this repository.

## Project Overview

PR-Please is a Chrome extension + optional backend service that generates GitHub Pull Request titles and descriptions using Google Gemini AI. It injects a "Generate with AI" button into GitHub's PR creation page.

## Architecture

- **`extension/`** — Chrome Extension (Manifest V3, TypeScript, Vite)
  - `src/background.ts` — Service worker: fetches PR diffs, calls Gemini API (local mode) or backend service (remote mode)
  - `src/content.ts` — Content script: injects UI into GitHub PR pages, handles user interactions
  - `src/popup.ts` — Extension popup: settings management (mode, API key, service URL)
  - `src/popup.html` / `src/popup.css` — Popup markup and styles
  - `public/manifest.json` — Extension manifest with CSP, permissions, content script registration
- **`service/`** — Optional Fastify backend (TypeScript)
  - `src/index.ts` — Single-file API server with `/ping` and `/generate` endpoints
  - Uses in-memory caching and rate limiting (100 req/min)

## Build & Run

### Extension
```bash
cd extension && npm install && npm run build
```
Output goes to `extension/dist/`. Load as unpacked extension in Chrome.

### Service
```bash
cd service && npm install && cp .env.example .env
# Edit .env with your GEMINI_API_KEY
npm run build && npm start
# Or for dev: npm run dev
```

## Key Patterns

- **No `innerHTML`** — All DOM construction in `content.ts` uses `createElement`/`textContent`/`appendChild`. This is intentional for security. Do not introduce `innerHTML`.
- **API key obfuscation** — Keys are XOR + base64 encoded before storage in `chrome.storage.local` via `obfuscateApiKey()`/`deobfuscateApiKey()`. These functions are duplicated in `background.ts`, `popup.ts`, and `content.ts` since they run in separate contexts.
- **URL validation** — All user-provided URLs are validated via `validateUrl()` in `background.ts` before use in `fetch()`.
- **User consent gate** — `content.ts` shows a `confirm()` dialog before sending any code data to external services.
- **Debounced MutationObserver** — The content script's DOM observer uses a 200ms debounce to avoid excessive re-runs.

## Security

A full audit report is at `extension/SECURITY_AUDIT.md`. Key constraints:
- Manifest has explicit CSP: `script-src 'self'; object-src 'none'`
- Only `storage` and `activeTab` permissions (no `scripting`)
- Host permissions scoped to `github.com/*/*/pull/*`, `github.com/*/*/compare/*`, and `generativelanguage.googleapis.com/v1beta/models/*`
- No external resource loading (no CDN fonts, no remote scripts)

## Common Tasks

- **Adding a new setting** — Update the `Settings` interface in all three TS files, add to `chrome.storage.local.get()`/`.set()` calls, and add UI in both `popup.html`/`popup.ts` (popup) and `content.ts` (in-page modal).
- **Changing the LLM prompt** — Edit `constructPrompt()` in `background.ts` (extension) and the inline prompt in `service/src/index.ts` (backend).
- **Modifying injected UI** — Edit `content.ts`. All UI elements are built with the `el()` helper and `icon()` function. Styles are in the `INJECTED_STYLES` constant.

## Environment

- Extension: TypeScript, Vite, Chrome APIs (`chrome.storage`, `chrome.runtime`)
- Service: TypeScript, Fastify, `@google/generative-ai`, dotenv
- No test framework is currently configured
