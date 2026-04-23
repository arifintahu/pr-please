import {
  DEFAULT_BASE_URL,
  LOCALHOST_BASE_URL,
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  GITHUB_REPO,
  resolveProvider,
  obfuscateApiKey,
  deobfuscateApiKey,
  type ApiProvider,
} from './utils';

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const defaultSettings: Settings = {
  apiKey: '',
  baseUrl: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
};

const STAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function formatStarCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(n / 1000) + 'k';
}

async function loadStarCount(badge: HTMLElement) {
  try {
    const cached = await chrome.storage.local.get('starCache');
    const now = Date.now();
    const entry = cached.starCache as { count: number; ts: number } | undefined;
    if (entry && now - entry.ts < STAR_CACHE_TTL_MS) {
      badge.textContent = formatStarCount(entry.count);
      badge.hidden = false;
      return;
    }
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const count = typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
    if (count === null) return;
    badge.textContent = formatStarCount(count);
    badge.hidden = false;
    await chrome.storage.local.set({ starCache: { count, ts: now } });
  } catch {
    // Silently ignore — network errors shouldn't block settings UI
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const apiProviderSelect = document.getElementById('apiProvider') as HTMLSelectElement;
  const customUrlGroup = document.getElementById('customUrlGroup') as HTMLDivElement;
  const customBaseUrlInput = document.getElementById('customBaseUrl') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const toggleApiKeyBtn = document.getElementById('toggleApiKey') as HTMLButtonElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const btnClose = document.getElementById('btnClose') as HTMLButtonElement;
  const statusRow = document.getElementById('statusRow') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const starCount = document.getElementById('starCount') as HTMLSpanElement;

  loadStarCount(starCount);

  for (const model of MODEL_OPTIONS) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  }

  function showStatus(message: string, isError = false) {
    statusText.textContent = message;
    statusRow.hidden = false;
    statusRow.classList.toggle('error', isError);
    statusRow.setAttribute('role', isError ? 'alert' : 'status');
    setTimeout(() => {
      statusRow.hidden = true;
      statusRow.classList.remove('error');
      statusRow.setAttribute('role', 'status');
    }, 2500);
  }

  function applyProvider(provider: ApiProvider, storedBaseUrl?: string) {
    apiProviderSelect.value = provider;
    customUrlGroup.hidden = provider !== 'custom';
    if (provider === 'custom') {
      customBaseUrlInput.value = storedBaseUrl && resolveProvider(storedBaseUrl) === 'custom'
        ? storedBaseUrl
        : (customBaseUrlInput.value || '');
    }
  }

  function resolveBaseUrl(): string | null {
    const provider = apiProviderSelect.value as ApiProvider;
    if (provider === 'default') return DEFAULT_BASE_URL;
    if (provider === 'localhost') return LOCALHOST_BASE_URL;
    const value = customBaseUrlInput.value.trim();
    if (!value) return null;
    try {
      const u = new URL(value);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return value.replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  chrome.storage.local.get(['baseUrl', 'model', 'apiKeyEncoded'], (result) => {
    const settings = { ...defaultSettings, ...result };
    const provider = resolveProvider(settings.baseUrl);
    applyProvider(provider, settings.baseUrl);
    modelSelect.value = settings.model || defaultSettings.model;
    apiKeyInput.value = result.apiKeyEncoded ? deobfuscateApiKey(result.apiKeyEncoded) : '';
  });

  apiProviderSelect.addEventListener('change', () => {
    applyProvider(apiProviderSelect.value as ApiProvider);
    if (apiProviderSelect.value === 'custom') {
      customBaseUrlInput.focus();
    }
  });

  toggleApiKeyBtn.addEventListener('click', () => {
    const revealing = apiKeyInput.type === 'password';
    apiKeyInput.type = revealing ? 'text' : 'password';
    toggleApiKeyBtn.setAttribute('aria-pressed', String(revealing));
    toggleApiKeyBtn.setAttribute('aria-label', revealing ? 'Hide API key' : 'Show API key');
  });

  if (btnClose) {
    btnClose.addEventListener('click', () => window.close());
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = resolveBaseUrl();
    const model = modelSelect.value;

    if (baseUrl === null) {
      showStatus('Invalid Custom URL (must start with http:// or https://)', true);
      customBaseUrlInput.focus();
      return;
    }

    if (!apiKey) {
      showStatus('Please enter an API key', true);
      apiKeyInput.focus();
      return;
    }

    const storageData = {
      baseUrl,
      model,
      apiKeyEncoded: obfuscateApiKey(apiKey),
    };

    chrome.storage.local.set(storageData, () => {
      if (chrome.runtime.lastError) {
        showStatus('Error saving settings', true);
        return;
      }
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      showStatus('Settings saved');
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
        saveBtn.classList.remove('saved');
      }, 2000);
    });
  });
});
