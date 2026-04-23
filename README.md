<div align="center">
  <img src="public/icons/icon128.png" alt="PR-Please Logo" width="100" height="100">
  <h1>PR-Please</h1>
  <p>
    <b>Generate structured GitHub Pull Request titles and descriptions instantly</b>
  </p>
</div>

## Features

- **AI-Powered Generation** — Analyzes commits and code diffs to produce Conventional Commit titles and structured PR descriptions.
- **Direct Gemini API** — Uses your own Google Gemini API key right from the browser. No backend, no middleman.
- **Privacy & Efficiency**
  - Filters lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `.env`) automatically.
  - Cleans git diff metadata to save tokens and reduce noise.
- **Security Hardened**
  - Explicit Content Security Policy (CSP) in manifest.
  - API keys stored obfuscated (XOR + base64) in local storage — never plaintext, never synced.
  - Minimal permissions: only `storage` and `activeTab`.
  - Scoped host permissions to GitHub PR/compare pages and the Gemini API only.
  - No `innerHTML` — all DOM built via safe APIs.
- **Native Experience** — Injects seamlessly into GitHub PR pages with a UI matching GitHub's design system.

## Installation

```bash
git clone https://github.com/arifintahu/pr-please.git
cd pr-please
npm install
npm run build
```

Then load in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the `dist` folder.

## Configuration

Click the **PR-Please** extension icon in your browser toolbar to configure.

1. Paste your **Google Gemini API Key** ([get one here](https://aistudio.google.com/apikey)).
2. Choose a **model** (default: `gemini-2.5-flash`).
3. *(Optional)* Set a custom **Base URL** if you use a Gemini-compatible proxy.
4. Click **Save Settings**.

Your API key is stored obfuscated in the browser's local storage and persists across sessions.

## How to Use

1. Push your changes to GitHub.
2. Open a **Compare & pull request** page.
3. Click the **Generate with AI** button next to the PR title field.
4. The generated title and description are inserted into the form automatically.

## License

MIT
