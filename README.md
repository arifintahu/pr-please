# PR-Please

An extension that scrapes GitHub PR changes and uses Google Gemini to generate structured titles and descriptions.

## Architecture

- **`extension/`**: Chrome extension built with TypeScript, Vite, and Manifest V3.
- **`service/`**: Backend service built with Fastify, TypeScript, and Google Gemini API.

## Features

- **Hybrid Mode**: Use your own Gemini API Key locally OR connect to a remote service.
- **Context Scraping**: Extracts commit messages and code diffs directly from GitHub.
- **Smart Filtering**: Automatically excludes lockfiles and truncates large diffs to stay within token limits.
- **Structured Output**: Generates titles in Conventional Commits format and descriptions using a standardized markdown template.
- **Caching**: Backend service implements caching to reduce latency and API costs.

## Setup

### 1. Backend Service

1. Navigate to `service/`:
   ```bash
   cd service
   npm install
   ```
2. Create a `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   # Optional: Custom Gemini API Base URL (e.g. for proxies)
   # GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8045
   # Optional: Custom Gemini Model (e.g. for proxies)
   # GEMINI_MODEL=gemini-2.5-flash
   ```
3. Start the server:
   ```bash
   npm run dev
   # or for production
   npm run build && npm start
   ```

### 2. Chrome Extension

1. Navigate to `extension/`:
   ```bash
   cd extension
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder.

## Usage

1. Click the PR-Please icon in your browser to configure your settings.
2. Go to any "New Pull Request" page on GitHub.
3. Click the "✨ Generate" button next to the PR title.
4. Watch the AI fill in your title and description!

## License

MIT
