<div align="center">
  <img src="extension/public/icons/icon128.png" alt="PR-Please Logo" width="100" height="100">
  <h1>PR-Please</h1>
  <p>
    <b>Generate structured GitHub Pull Request titles and descriptions instantly using Google Gemini AI.</b>
  </p>
</div>

## Features

- **AI-Powered Generation** — Analyzes commits and code diffs to produce Conventional Commit titles and structured PR descriptions.
- **Hybrid Operation**
  - **Local Mode** — Use your own Gemini API key directly in the browser. No backend required.
  - **Service Mode** — Connect to a hosted backend for shared team usage, caching, and centralized key management.
- **Privacy & Efficiency**
  - Filters lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `.env`) automatically.
  - Cleans git diff metadata to save tokens and reduce noise.
  - User consent prompt before sending code data to any external service.
- **Security Hardened**
  - Explicit Content Security Policy (CSP) in manifest.
  - API keys stored obfuscated (XOR + base64) in local storage — never plaintext.
  - Minimal permissions: only `storage` and `activeTab`.
  - Scoped host permissions to GitHub PR/compare pages and Gemini API only.
  - Service URL validated before use. No `innerHTML` — all DOM built via safe APIs.
- **Native Experience** — Injects seamlessly into GitHub PR pages with a UI matching GitHub's design system.

## Project Structure

```
pr-please/
├── extension/          # Chrome extension (Manifest V3)
│   ├── public/         # Static assets, manifest.json, icons
│   ├── src/
│   │   ├── background.ts   # Service worker — fetches diffs, calls LLM
│   │   ├── content.ts      # Content script — injects UI into GitHub pages
│   │   ├── popup.ts        # Extension popup — settings management
│   │   ├── popup.html      # Popup markup
│   │   └── popup.css       # Popup styles
│   ├── vite.config.ts
│   └── package.json
├── service/            # Optional backend service (Fastify)
│   ├── src/
│   │   └── index.ts        # API server — /ping, /generate endpoints
│   ├── .env.example
│   └── package.json
└── README.md
```

## Installation

### 1. Chrome Extension (Required)

```bash
git clone https://github.com/arifintahu/pr-please.git
cd pr-please/extension
npm install
npm run build
```

Then load in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the `extension/dist` folder.

### 2. Backend Service (Optional)

Required only for Service Mode (e.g., shared team usage).

```bash
cd service
npm install
cp .env.example .env
```

Configure `.env`:

```env
GEMINI_API_KEY=your_actual_api_key
PORT=3000
GEMINI_MODEL=gemini-2.5-flash
# Optional: Custom Gemini API Base URL (e.g. for proxies)
# GOOGLE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

Start the server:

```bash
npm run build
npm start
# or for development:
npm run dev
```

The service exposes:
- `GET /ping` — Health check
- `POST /generate` — Accepts `{ commits, diff }`, returns `{ title, description }`

## Configuration

Click the **PR-Please** extension icon in your browser toolbar to configure.

### Service Mode (Default)

Ideal for teams.

1. Select **Service** mode.
2. Enter the **Service URL** (default: `http://localhost:3000`).
3. The extension will verify the connection via `/ping`.
4. Click **Save Settings**.

### Local Mode

Ideal for individual developers.

1. Select **Local** mode.
2. Enter your **Google Gemini API Key**.
3. Choose your model (e.g., `gemini-2.5-flash`).
4. Click **Save Settings**.

Your API key is stored obfuscated in the browser's local storage and persists across sessions.

## How to Use

1. Push your changes to GitHub.
2. Open a **Compare & pull request** page.
3. Click the **Generate with AI** button next to the PR title field.
4. A consent dialog confirms the destination before sending your code.
5. Review the generated title and description in the result bar.
6. Click **Apply** to insert them into the form.

## Security

A full security audit has been conducted based on [ChromeAudit](https://github.com/nullenc0de/ChromeAudit) criteria. See [`extension/SECURITY_AUDIT.md`](extension/SECURITY_AUDIT.md) for the detailed report.

Key security measures:
- **CSP enforced** — `script-src 'self'; object-src 'none'`
- **Minimal permissions** — Only `storage` and `activeTab`; no `scripting`
- **Scoped host access** — Narrowed to specific GitHub and Gemini API paths
- **No `innerHTML`** — All DOM construction uses safe `createElement`/`textContent` APIs
- **API key obfuscated** — XOR + base64 encoded in `chrome.storage.local`
- **URL validation** — Service URLs validated with scheme allowlist before fetch
- **User consent gate** — Confirmation dialog before sending any code data externally
- **No external resource loading** — System fonts only, no CDN requests

## License

MIT
