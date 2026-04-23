import { DEFAULT_BASE_URL, DEFAULT_MODEL, MODEL_OPTIONS, obfuscateApiKey, deobfuscateApiKey } from './utils';

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

document.addEventListener('DOMContentLoaded', () => {
  const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const toggleApiKeyBtn = document.getElementById('toggleApiKey') as HTMLSpanElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const btnClose = document.getElementById('btnClose') as HTMLButtonElement;
  const statusRow = document.getElementById('statusRow') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;

  MODEL_OPTIONS.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });

  function showStatus(message: string, isError = false) {
    statusRow.style.display = 'flex';
    statusText.textContent = message;
    statusRow.classList.toggle('error', isError);
    setTimeout(() => {
      statusRow.style.display = 'none';
      statusRow.classList.remove('error');
    }, 2000);
  }

  function updateUrlHighlight() {
    const isCustom = baseUrlInput.value.trim() !== DEFAULT_BASE_URL && baseUrlInput.value.trim() !== '';
    baseUrlInput.classList.toggle('custom', isCustom);
    baseUrlInput.title = isCustom ? 'Custom Base URL active' : 'Default Google Base URL';
  }

  chrome.storage.local.get(['baseUrl', 'model', 'apiKeyEncoded'], (result) => {
    const settings = { ...defaultSettings, ...result };
    baseUrlInput.value = settings.baseUrl || defaultSettings.baseUrl;
    modelSelect.value = settings.model || defaultSettings.model;
    apiKeyInput.value = result.apiKeyEncoded ? deobfuscateApiKey(result.apiKeyEncoded) : '';
    updateUrlHighlight();
  });

  baseUrlInput.addEventListener('input', updateUrlHighlight);

  toggleApiKeyBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  if (btnClose) {
    btnClose.addEventListener('click', () => window.close());
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim() || DEFAULT_BASE_URL;
    const model = modelSelect.value;

    try {
      new URL(baseUrl);
    } catch {
      showStatus('Invalid Base URL format', true);
      return;
    }

    if (!apiKey) {
      showStatus('Please enter an API key', true);
      return;
    }

    const storageData = {
      baseUrl,
      model,
      apiKeyEncoded: obfuscateApiKey(apiKey)
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
