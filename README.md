<div align="center">
  <img src="extension/public/icons/icon128.png" alt="PR-Please Logo" width="100" height="100">
  <h1>PR-Please</h1>
  <p>
    <b>Generate structured GitHub Pull Request titles and descriptions instantly using Google Gemini AI.</b>
  </p>
</div>


## 🚀 Features

- **✨ AI-Powered Generation**: Analyzes your commits and code diffs to generate meaningful PR titles (Conventional Commits) and descriptions.
- **🔌 Hybrid Operation**:
  - **Local Mode**: Use your own Gemini API Key directly in the browser. No backend required!
  - **Service Mode**: Connect to a hosted backend service for shared team usage, caching, and centralized key management.
- **🔒 Privacy & Efficiency**:
  - Automatically filters lockfiles (`package-lock.json`, etc.) and truncates large files.
  - Cleans git diffs (removes headers, metadata) to save tokens and improve privacy.
- **⚡ Fast & Responsive**:
  - Optimized prompts for `gemini-2.5-flash`.
  - Built-in connection checking and timeout handling (60s).
- **🎨 Native Experience**: Injects seamlessly into the GitHub PR page with a UI that matches GitHub's design system.


## 🛠️ Installation

### 1. Chrome Extension (Required)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/pr-please.git
    cd pr-please
    ```

2.  **Build the extension**:
    ```bash
    cd extension
    npm install
    npm run build
    ```

3.  **Load in Chrome**:
    - Open `chrome://extensions/`
    - Enable **Developer mode** (top right toggle).
    - Click **Load unpacked**.
    - Select the `pr-please/extension/dist` folder.

### 2. Backend Service (Optional)

> Required only if you want to run in "Service Mode" (e.g., for a team).

1.  **Setup Service**:
    ```bash
    cd service
    npm install
    cp .env.example .env
    ```

2.  **Configure `.env`**:
    ```env
    GEMINI_API_KEY=your_actual_api_key
    # Optional: Custom Gemini API Base URL (e.g. for proxies)
    # GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8045
    ```

3.  **Start Server**:
    ```bash
    npm run build
    npm start
    ```

## ⚙️ Configuration

Click the **PR-Please** extension icon in your browser toolbar to configure settings.

### Mode: Service (Default)
Ideal for teams usage.
1.  Select **Service** mode.
2.  Enter the **Service URL** (default: `http://localhost:3000`).
3.  The extension will verify the connection (`/ping`).
4.  Click **Save Settings**.

### Mode: Local
Ideal for individual developers.
1.  Select **Local** mode.
2.  Enter your **Google Gemini API Key**.
3.  Choose your model (e.g., `gemini-1.5-flash`).
4.  Click **Save Settings**.


## 📖 How to Use

1.  **Push your changes** to GitHub.
2.  Open a **"Compare & pull request"** page on GitHub.
3.  You will see a new **"✨ Generate with AI"** button next to the PR title field.
4.  Click it! The AI will analyze your commits and diffs.
5.  Review the generated Title and Description in the result bar.
6.  Click **Apply** to insert them into the form.

## 📄 License

MIT
