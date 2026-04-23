import {
  GITHUB_REPO,
  DEFAULT_PROVIDER,
  loadSettings,
  saveSettings,
  obfuscateApiKey,
  deobfuscateApiKey,
  type ProviderConfig,
  type StoredSettings,
} from './utils';
import { PROVIDERS, isProviderId, type ProviderId } from './providers';

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

type EndpointChoice = 'default' | 'custom';

function resolveEndpointChoice(baseUrl: string, defaultBaseUrl: string): EndpointChoice {
  const trimmed = (baseUrl || '').trim().replace(/\/$/, '');
  if (!trimmed || trimmed === defaultBaseUrl) return 'default';
  return 'custom';
}

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  const apiProviderSelect = document.getElementById('apiProvider') as HTMLSelectElement;
  const customUrlGroup = document.getElementById('customUrlGroup') as HTMLDivElement;
  const customBaseUrlInput = document.getElementById('customBaseUrl') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const apiKeyGroup = document.getElementById('apiKeyGroup') as HTMLDivElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const toggleApiKeyBtn = document.getElementById('toggleApiKey') as HTMLButtonElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const btnClose = document.getElementById('btnClose') as HTMLButtonElement;
  const statusRow = document.getElementById('statusRow') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const starCount = document.getElementById('starCount') as HTMLSpanElement;
  const providerIntroTitle = document.getElementById('providerIntroTitle') as HTMLDivElement;

  loadStarCount(starCount);

  const settings: StoredSettings = await loadSettings();
  let currentProviderId: ProviderId = settings.provider || DEFAULT_PROVIDER;

  function populateModelOptions(providerId: ProviderId, selectedModel: string) {
    const options = PROVIDERS[providerId].modelOptions;
    modelSelect.textContent = '';
    for (const model of options) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    }
    modelSelect.value = options.includes(selectedModel) ? selectedModel : PROVIDERS[providerId].defaultModel;
  }

  function applyEndpointChoice(providerId: ProviderId, choice: EndpointChoice, storedBaseUrl?: string) {
    const provider = PROVIDERS[providerId];
    apiProviderSelect.value = choice;
    customUrlGroup.hidden = choice !== 'custom';
    if (choice === 'custom') {
      if (storedBaseUrl && storedBaseUrl !== provider.defaultBaseUrl) {
        customBaseUrlInput.value = storedBaseUrl;
      }
    }
  }

  function renderForProvider(providerId: ProviderId, config: ProviderConfig) {
    const provider = PROVIDERS[providerId];
    currentProviderId = providerId;
    providerSelect.value = providerId;
    providerIntroTitle.textContent = provider.label;

    populateModelOptions(providerId, config.model);

    const baseUrl = config.baseUrl || provider.defaultBaseUrl;
    customBaseUrlInput.value = '';
    applyEndpointChoice(providerId, resolveEndpointChoice(baseUrl, provider.defaultBaseUrl), baseUrl);

    apiKeyGroup.hidden = !provider.requiresApiKey;
    apiKeyInput.placeholder = provider.requiresApiKey ? `Enter your ${provider.label} API key` : '';
    apiKeyInput.value = config.apiKeyEncoded ? deobfuscateApiKey(config.apiKeyEncoded) : '';
  }

  function resolveBaseUrl(providerId: ProviderId): string | null {
    const provider = PROVIDERS[providerId];
    const choice = apiProviderSelect.value as EndpointChoice;
    if (choice === 'default') return provider.defaultBaseUrl;
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

  // Initial render for the active provider.
  renderForProvider(currentProviderId, settings.providers[currentProviderId]);

  providerSelect.addEventListener('change', () => {
    const next = providerSelect.value;
    if (!isProviderId(next)) return;
    renderForProvider(next, settings.providers[next]);
  });

  apiProviderSelect.addEventListener('change', () => {
    applyEndpointChoice(currentProviderId, apiProviderSelect.value as EndpointChoice);
    if (apiProviderSelect.value === 'custom') customBaseUrlInput.focus();
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

  saveBtn.addEventListener('click', async () => {
    const provider = PROVIDERS[currentProviderId];
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = resolveBaseUrl(currentProviderId);
    const model = modelSelect.value;

    if (baseUrl === null) {
      showStatus('Invalid Custom URL (must start with http:// or https://)', true);
      customBaseUrlInput.focus();
      return;
    }

    if (provider.requiresApiKey && !apiKey) {
      showStatus('Please enter an API key', true);
      apiKeyInput.focus();
      return;
    }

    const updated: StoredSettings = {
      provider: currentProviderId,
      providers: {
        ...settings.providers,
        [currentProviderId]: {
          apiKeyEncoded: apiKey ? obfuscateApiKey(apiKey) : '',
          baseUrl,
          model,
        },
      },
    };

    try {
      await saveSettings(updated);
      settings.provider = updated.provider;
      settings.providers = updated.providers;
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      showStatus('Settings saved');
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
        saveBtn.classList.remove('saved');
      }, 2000);
    } catch {
      showStatus('Error saving settings', true);
    }
  });
});
