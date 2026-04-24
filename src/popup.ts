import {
  GITHUB_REPO,
  DEFAULT_PROVIDER,
  loadSettings,
  saveSettings,
  obfuscateApiKey,
  deobfuscateApiKey,
  type StoredSettings,
} from './utils';
import { PROVIDERS, isProviderId, type ProviderId } from './providers';

const STAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function formatStarCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(n / 1000) + 'k';
}

async function loadStarCount(badge: HTMLElement, force = false) {
  try {
    const cached = await chrome.storage.local.get('starCache');
    const now = Date.now();
    const entry = cached.starCache as { count: number; ts: number } | undefined;
    if (!force && entry && now - entry.ts < STAR_CACHE_TTL_MS) {
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

const PROVIDER_KEY_LINKS: Record<ProviderId, string> = {
  gemini: 'https://ai.google.dev/gemini-api/docs/api-key',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  ollama: '',
};

const PROVIDER_KEY_DESCS: Record<ProviderId, string> = {
  gemini: 'Google Gemini has a free tier. Click below to create a key at Google AI Studio.',
  openai: "You'll need an OpenAI account. Click below to create a key.",
  anthropic: "You'll need an Anthropic account. Click below to create a key.",
  ollama: '',
};

const RECOMMENDED_PATTERNS = ['.env*', 'secrets/**', '*.pem', '*.key', '*.cert'];

document.addEventListener('DOMContentLoaded', async () => {
  // ── Elements ──────────────────────────────────────────────
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
  const starRefreshBtn = document.getElementById('starRefreshBtn') as HTMLButtonElement;
  const providerIntroTitle = document.getElementById('providerIntroTitle') as HTMLDivElement;
  const onboardingEl = document.getElementById('onboarding') as HTMLDivElement;
  const settingsBodyEl = document.getElementById('settingsBody') as HTMLDivElement;
  const redactTagsEl = document.getElementById('redactTags') as HTMLDivElement;
  const redactInput = document.getElementById('redactInput') as HTMLInputElement;
  const redactAddBtn = document.getElementById('redactAddBtn') as HTMLButtonElement;
  const redactRecommendedBtn = document.getElementById('redactRecommendedBtn') as HTMLButtonElement;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  const exportIncludeKeys = document.getElementById('exportIncludeKeys') as HTMLInputElement;
  const importFile = document.getElementById('importFile') as HTMLInputElement;
  const importStatusRow = document.getElementById('importStatusRow') as HTMLDivElement;
  const importStatusText = document.getElementById('importStatusText') as HTMLSpanElement;

  loadStarCount(starCount);

  const settings: StoredSettings = await loadSettings();
  let currentProviderId: ProviderId = settings.provider || DEFAULT_PROVIDER;
  let redactPatterns: string[] = [...settings.redactPatterns];

  // ── Star refresh ──────────────────────────────────────────
  starRefreshBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    loadStarCount(starCount, true);
  });

  // ── Onboarding ────────────────────────────────────────────
  const activeConfig = settings.providers[currentProviderId];
  const needsOnboarding =
    PROVIDERS[currentProviderId].requiresApiKey && !activeConfig.apiKeyEncoded;

  function showOnboarding() {
    onboardingEl.hidden = false;
    settingsBodyEl.hidden = true;
    showOnboardStep(1);
  }

  function dismissOnboarding() {
    onboardingEl.hidden = true;
    settingsBodyEl.hidden = false;
  }

  let onboardSelectedProvider: ProviderId = currentProviderId;

  function showOnboardStep(step: 1 | 2 | 3 | 'ollama') {
    for (const el of ['onboardStep1', 'onboardStep2', 'onboardStep3', 'onboardStepOllama']) {
      (document.getElementById(el) as HTMLElement).hidden = true;
    }
    if (step === 1) (document.getElementById('onboardStep1') as HTMLElement).hidden = false;
    else if (step === 2) (document.getElementById('onboardStep2') as HTMLElement).hidden = false;
    else if (step === 3) (document.getElementById('onboardStep3') as HTMLElement).hidden = false;
    else if (step === 'ollama')
      (document.getElementById('onboardStepOllama') as HTMLElement).hidden = false;
  }

  function updateOnboardKeyStep(provider: ProviderId) {
    const title = document.getElementById('onboardKeyTitle') as HTMLElement;
    const desc = document.getElementById('onboardKeyDesc') as HTMLElement;
    const link = document.getElementById('onboardKeyLink') as HTMLAnchorElement;
    title.textContent = `Get your ${PROVIDERS[provider].label} API key`;
    desc.textContent = PROVIDER_KEY_DESCS[provider];
    link.href = PROVIDER_KEY_LINKS[provider];
    link.textContent = `Get ${PROVIDERS[provider].label} API key →`;
  }

  (document.getElementById('onboardStep1Next') as HTMLButtonElement).addEventListener(
    'click',
    () => {
      const sel = document.getElementById('onboardProvider') as HTMLSelectElement;
      onboardSelectedProvider = isProviderId(sel.value) ? sel.value : 'gemini';
      if (onboardSelectedProvider === 'ollama') {
        showOnboardStep('ollama');
      } else {
        updateOnboardKeyStep(onboardSelectedProvider);
        showOnboardStep(2);
      }
    }
  );

  (document.getElementById('onboardStep2Next') as HTMLButtonElement).addEventListener('click', () =>
    showOnboardStep(3)
  );
  (document.getElementById('onboardStep2Back') as HTMLButtonElement).addEventListener('click', () =>
    showOnboardStep(1)
  );
  (document.getElementById('onboardStep3Back') as HTMLButtonElement).addEventListener('click', () =>
    showOnboardStep(2)
  );
  (document.getElementById('onboardOllamaBack') as HTMLButtonElement).addEventListener(
    'click',
    () => showOnboardStep(1)
  );
  (document.getElementById('onboardOllamaDone') as HTMLButtonElement).addEventListener(
    'click',
    () => {
      currentProviderId = onboardSelectedProvider;
      providerSelect.value = currentProviderId;
      renderForProvider(currentProviderId);
      dismissOnboarding();
    }
  );

  const toggleOnboardKey = document.getElementById('onboardToggleKey') as HTMLButtonElement;
  const onboardApiKeyInput = document.getElementById('onboardApiKey') as HTMLInputElement;
  toggleOnboardKey.addEventListener('click', () => {
    const revealing = onboardApiKeyInput.type === 'password';
    onboardApiKeyInput.type = revealing ? 'text' : 'password';
    toggleOnboardKey.setAttribute('aria-pressed', String(revealing));
  });

  (document.getElementById('onboardSave') as HTMLButtonElement).addEventListener(
    'click',
    async () => {
      const key = onboardApiKeyInput.value.trim();
      if (!key) {
        onboardApiKeyInput.focus();
        return;
      }
      const provider = PROVIDERS[onboardSelectedProvider];
      const updated: StoredSettings = {
        ...settings,
        provider: onboardSelectedProvider,
        providers: {
          ...settings.providers,
          [onboardSelectedProvider]: {
            ...settings.providers[onboardSelectedProvider],
            apiKeyEncoded: obfuscateApiKey(key),
            baseUrl: provider.defaultBaseUrl,
            model: provider.defaultModel,
          },
        },
      };
      await saveSettings(updated);
      Object.assign(settings, updated);
      currentProviderId = onboardSelectedProvider;
      renderForProvider(currentProviderId);
      dismissOnboarding();
    }
  );

  for (const id of ['onboardDismiss1', 'onboardDismiss2', 'onboardDismiss3']) {
    document.getElementById(id)?.addEventListener('click', dismissOnboarding);
  }

  if (needsOnboarding) showOnboarding();

  // ── Main settings form ────────────────────────────────────
  function populateModelOptions(providerId: ProviderId, selectedModel: string) {
    const options = PROVIDERS[providerId].modelOptions;
    modelSelect.textContent = '';
    for (const model of options) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    }
    modelSelect.value = options.includes(selectedModel)
      ? selectedModel
      : PROVIDERS[providerId].defaultModel;
  }

  function applyEndpointChoice(
    providerId: ProviderId,
    choice: EndpointChoice,
    storedBaseUrl?: string
  ) {
    apiProviderSelect.value = choice;
    customUrlGroup.hidden = choice !== 'custom';
    if (
      choice === 'custom' &&
      storedBaseUrl &&
      storedBaseUrl !== PROVIDERS[providerId].defaultBaseUrl
    ) {
      customBaseUrlInput.value = storedBaseUrl;
    }
  }

  function renderForProvider(providerId: ProviderId) {
    const provider = PROVIDERS[providerId];
    const config = settings.providers[providerId];
    currentProviderId = providerId;
    providerSelect.value = providerId;
    providerIntroTitle.textContent = provider.label;
    populateModelOptions(providerId, config.model);
    const baseUrl = config.baseUrl || provider.defaultBaseUrl;
    customBaseUrlInput.value = '';
    applyEndpointChoice(
      providerId,
      resolveEndpointChoice(baseUrl, provider.defaultBaseUrl),
      baseUrl
    );
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

  renderForProvider(currentProviderId);

  providerSelect.addEventListener('change', () => {
    if (!isProviderId(providerSelect.value)) return;
    renderForProvider(providerSelect.value);
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

  btnClose?.addEventListener('click', () => window.close());

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
      redactPatterns,
    };

    try {
      await saveSettings(updated);
      Object.assign(settings, updated);
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

  // ── Redact patterns ───────────────────────────────────────
  function renderTags() {
    redactTagsEl.textContent = '';
    for (const pattern of redactPatterns) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = pattern;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-chip-remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Remove ${pattern}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        redactPatterns = redactPatterns.filter((p) => p !== pattern);
        renderTags();
      });
      chip.appendChild(removeBtn);
      redactTagsEl.appendChild(chip);
    }
  }

  function addPattern(pattern: string) {
    const p = pattern.trim();
    if (!p || redactPatterns.includes(p)) return;
    redactPatterns.push(p);
    renderTags();
  }

  redactAddBtn.addEventListener('click', () => {
    addPattern(redactInput.value);
    redactInput.value = '';
    redactInput.focus();
  });
  redactInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPattern(redactInput.value);
      redactInput.value = '';
    }
  });
  redactRecommendedBtn.addEventListener('click', () => {
    RECOMMENDED_PATTERNS.forEach(addPattern);
  });
  renderTags();

  // ── Export ────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const includeKeys = exportIncludeKeys.checked;
    const exportData: StoredSettings = {
      provider: settings.provider,
      redactPatterns: settings.redactPatterns,
      providers: Object.fromEntries(
        Object.entries(settings.providers).map(([id, cfg]) => [
          id,
          {
            ...cfg,
            apiKeyEncoded: includeKeys ? cfg.apiKeyEncoded : '',
          },
        ])
      ) as StoredSettings['providers'],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pr-please-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Import ────────────────────────────────────────────────
  function showImportStatus(msg: string, isError = false) {
    importStatusText.textContent = msg;
    importStatusRow.hidden = false;
    importStatusRow.classList.toggle('error', isError);
    setTimeout(() => {
      importStatusRow.hidden = true;
    }, 3000);
  }

  function validateImport(data: unknown): data is StoredSettings {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (!isProviderId(d.provider)) return false;
    if (typeof d.providers !== 'object' || !d.providers) return false;
    return true;
  }

  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!validateImport(parsed)) {
        showImportStatus('Invalid settings file format', true);
        return;
      }
      // Merge imported settings (providers not in import keep existing config)
      const merged: StoredSettings = {
        provider: parsed.provider,
        redactPatterns: Array.isArray(parsed.redactPatterns) ? parsed.redactPatterns : [],
        providers: { ...settings.providers, ...parsed.providers },
      };
      await saveSettings(merged);
      Object.assign(settings, merged);
      redactPatterns = [...merged.redactPatterns];
      renderTags();
      renderForProvider(merged.provider);
      showImportStatus('Settings imported successfully');
    } catch {
      showImportStatus('Failed to parse settings file', true);
    } finally {
      importFile.value = '';
    }
  });
});
