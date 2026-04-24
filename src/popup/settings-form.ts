import {
  obfuscateApiKey,
  deobfuscateApiKey,
  saveSettings,
  type StoredSettings,
} from '../utils';
import { PROVIDERS, isProviderId, type ProviderId } from '../providers';
import type { PopupElements } from './elements';

type EndpointChoice = 'default' | 'custom';
const SAVE_RESET_DELAY_MS = 2000;
const STATUS_DISPLAY_MS = 2500;

function resolveEndpointChoice(baseUrl: string, defaultBaseUrl: string): EndpointChoice {
  const trimmed = (baseUrl || '').trim().replace(/\/$/, '');
  if (!trimmed || trimmed === defaultBaseUrl) return 'default';
  return 'custom';
}

function populateModelOptions(
  elements: PopupElements,
  providerId: ProviderId,
  selectedModel: string
) {
  const options = PROVIDERS[providerId].modelOptions;
  elements.modelSelect.textContent = '';
  for (const model of options) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelSelect.appendChild(option);
  }
  elements.modelSelect.value = options.includes(selectedModel)
    ? selectedModel
    : PROVIDERS[providerId].defaultModel;
}

function applyEndpointChoice(
  elements: PopupElements,
  providerId: ProviderId,
  choice: EndpointChoice,
  storedBaseUrl?: string
) {
  elements.apiProviderSelect.value = choice;
  elements.customUrlGroup.hidden = choice !== 'custom';
  if (
    choice === 'custom' &&
    storedBaseUrl &&
    storedBaseUrl !== PROVIDERS[providerId].defaultBaseUrl
  ) {
    elements.customBaseUrlInput.value = storedBaseUrl;
  }
}

export function renderForProvider(
  elements: PopupElements,
  settings: StoredSettings,
  providerId: ProviderId
) {
  const provider = PROVIDERS[providerId];
  const config = settings.providers[providerId];
  elements.providerSelect.value = providerId;
  elements.providerIntroTitle.textContent = provider.label;
  populateModelOptions(elements, providerId, config.model);
  const baseUrl = config.baseUrl || provider.defaultBaseUrl;
  elements.customBaseUrlInput.value = '';
  applyEndpointChoice(
    elements,
    providerId,
    resolveEndpointChoice(baseUrl, provider.defaultBaseUrl),
    baseUrl
  );
  elements.apiKeyGroup.hidden = !provider.requiresApiKey;
  elements.apiKeyInput.placeholder = provider.requiresApiKey
    ? `Enter your ${provider.label} API key`
    : '';
  elements.apiKeyInput.value = config.apiKeyEncoded
    ? deobfuscateApiKey(config.apiKeyEncoded)
    : '';
}

function resolveBaseUrl(elements: PopupElements, providerId: ProviderId): string | null {
  const provider = PROVIDERS[providerId];
  const choice = elements.apiProviderSelect.value as EndpointChoice;
  if (choice === 'default') return provider.defaultBaseUrl;
  const value = elements.customBaseUrlInput.value.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return value.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function showStatus(elements: PopupElements, message: string, isError = false) {
  elements.statusText.textContent = message;
  elements.statusRow.hidden = false;
  elements.statusRow.classList.toggle('error', isError);
  elements.statusRow.setAttribute('role', isError ? 'alert' : 'status');
  setTimeout(() => {
    elements.statusRow.hidden = true;
    elements.statusRow.classList.remove('error');
    elements.statusRow.setAttribute('role', 'status');
  }, STATUS_DISPLAY_MS);
}

interface FormContext {
  elements: PopupElements;
  settings: StoredSettings;
  getRedactPatterns: () => string[];
  getCurrentProviderId: () => ProviderId;
  setCurrentProviderId: (id: ProviderId) => void;
}

async function handleSave(ctx: FormContext) {
  const { elements, settings } = ctx;
  const providerId = ctx.getCurrentProviderId();
  const provider = PROVIDERS[providerId];
  const apiKey = elements.apiKeyInput.value.trim();
  const baseUrl = resolveBaseUrl(elements, providerId);
  const model = elements.modelSelect.value;

  if (baseUrl === null) {
    showStatus(elements, 'Invalid Custom URL (must start with http:// or https://)', true);
    elements.customBaseUrlInput.focus();
    return;
  }
  if (provider.requiresApiKey && !apiKey) {
    showStatus(elements, 'Please enter an API key', true);
    elements.apiKeyInput.focus();
    return;
  }

  const updated: StoredSettings = {
    provider: providerId,
    providers: {
      ...settings.providers,
      [providerId]: {
        apiKeyEncoded: apiKey ? obfuscateApiKey(apiKey) : '',
        baseUrl,
        model,
      },
    },
    redactPatterns: ctx.getRedactPatterns(),
  };

  try {
    await saveSettings(updated);
    Object.assign(settings, updated);
    elements.saveBtn.textContent = 'Saved!';
    elements.saveBtn.classList.add('saved');
    showStatus(elements, 'Settings saved');
    setTimeout(() => {
      elements.saveBtn.textContent = 'Save Settings';
      elements.saveBtn.classList.remove('saved');
    }, SAVE_RESET_DELAY_MS);
  } catch {
    showStatus(elements, 'Error saving settings', true);
  }
}

export function setupSettingsForm(ctx: FormContext) {
  const { elements } = ctx;
  renderForProvider(elements, ctx.settings, ctx.getCurrentProviderId());

  elements.providerSelect.addEventListener('change', () => {
    if (!isProviderId(elements.providerSelect.value)) return;
    ctx.setCurrentProviderId(elements.providerSelect.value);
    renderForProvider(elements, ctx.settings, elements.providerSelect.value);
  });

  elements.apiProviderSelect.addEventListener('change', () => {
    applyEndpointChoice(
      elements,
      ctx.getCurrentProviderId(),
      elements.apiProviderSelect.value as EndpointChoice
    );
    if (elements.apiProviderSelect.value === 'custom') elements.customBaseUrlInput.focus();
  });

  elements.toggleApiKeyBtn.addEventListener('click', () => {
    const revealing = elements.apiKeyInput.type === 'password';
    elements.apiKeyInput.type = revealing ? 'text' : 'password';
    elements.toggleApiKeyBtn.setAttribute('aria-pressed', String(revealing));
    elements.toggleApiKeyBtn.setAttribute(
      'aria-label',
      revealing ? 'Hide API key' : 'Show API key'
    );
  });

  elements.btnClose?.addEventListener('click', () => window.close());
  elements.saveBtn.addEventListener('click', () => handleSave(ctx));
}
