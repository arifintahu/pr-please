<div align="center">
  <img src="public/icons/icon128.png" alt="PR-Please Logo" width="100" height="100">
  <h1>PR-Please</h1>
  <p>
    <b>Generate structured GitHub Pull Request titles and descriptions instantly</b>
  </p>
</div>

## Features

- **AI-powered PR generation** — Analyzes commits and code diffs to produce Conventional Commit titles and structured PR descriptions.
- **Multi-provider** — Bring your own API key for Google Gemini, OpenAI, or Anthropic, or run locally via Ollama. Each provider keeps its own key and model.
- **Streaming preview** — See the title and description as they stream in; edit before applying, or cycle through regenerated variations.
- **Works on create and edit** — Injects into *Compare & pull request* pages as well as the edit form on existing PRs.
- **Privacy & efficiency**
  - Skips lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) and env files automatically.
  - Diff redaction — configure glob patterns (e.g. `secrets/**`, `*.pem`) and matching files are replaced with `(Redacted: path)` before the diff is sent.
  - Cleans git-diff metadata to save tokens and reduce noise.
  - Token usage and cost estimates per generation, per model.
- **Security hardened**
  - Explicit Content Security Policy in the manifest.
  - API keys stored obfuscated (XOR + base64) in `chrome.storage.local` — never plaintext, never synced.
  - Minimal permissions: only `storage` and `activeTab`.
  - Host permissions scoped to GitHub PR/compare pages and the four provider API origins.
  - No `innerHTML` — all DOM is built via safe APIs.
- **Native experience** — UI matches GitHub's design system. Keyboard shortcut, onboarding wizard, settings import/export for backup.

## Installation

```bash
git clone https://github.com/arifintahu/pr-please.git
cd pr-please
npm install
npm run build
```

Then load in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `dist` folder.

## Configuration

Click the **PR-Please** extension icon in the toolbar. On first run, an onboarding wizard walks you through picking a provider and pasting your key.

Supported providers and where to get a key:

| Provider | Get a key | Default model |
| --- | --- | --- |
| Google Gemini | [Google AI Studio](https://aistudio.google.com/apikey) (free tier) | `gemini-2.5-flash` |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `gpt-5-mini` |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | `claude-sonnet-4-6` |
| Ollama (local) | No key — run `ollama serve` at `http://127.0.0.1:11434` | `llama3.1` |

Under **Advanced** you can override the API endpoint (e.g. for a self-hosted proxy) and configure diff-redaction glob patterns. The **Backup** row exports and imports the full settings JSON; uncheck *Include keys* when sharing settings with someone else.

Your API keys live only in the browser's local storage, obfuscated with XOR + base64. Nothing leaves your machine except the diff sent to the provider you selected.

## How to Use

1. Push your changes to GitHub.
2. Open a **Compare & pull request** page (or the *Edit* form on an existing PR).
3. Click **Generate with AI** next to the title field.
4. Watch the preview stream in. Tweak the result if you want, add extra context, or regenerate for a variation.
5. Apply — the title and description are written into GitHub's form.

## Development

```bash
npm run dev      # Vite dev server with HMR for popup + content script
npm run build    # tsc --noEmit + production build into dist/
npm test         # e2e tests (Vitest + Playwright) — builds dist first
npm run lint     # ESLint with the size/complexity rules in .claude/rules.md
npm run format   # Prettier write
```

Architecture notes are in [CLAUDE.md](CLAUDE.md); code style is enforced by [`.claude/rules.md`](.claude/rules.md).

## License

MIT
