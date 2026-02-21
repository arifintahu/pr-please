import { DEFAULT_SERVICE_URL, DEFAULT_MODEL, DEFAULT_LOCAL_BASE_URL, MODEL_OPTIONS, obfuscateApiKey, deobfuscateApiKey } from './utils';

interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
  localBaseUrl: string;
  model: string;
}

const defaultSettings: Settings = {
  mode: 'remote',
  apiKey: '',
  serviceUrl: DEFAULT_SERVICE_URL,
  localBaseUrl: DEFAULT_LOCAL_BASE_URL,
  model: DEFAULT_MODEL,
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const modeServiceBtn = document.getElementById('modeService') as HTMLButtonElement;
  const modeLocalBtn = document.getElementById('modeLocal') as HTMLButtonElement;
  const serviceFields = document.getElementById('serviceFields') as HTMLDivElement;
  const localFields = document.getElementById('localFields') as HTMLDivElement;
  
  const serviceUrlInput = document.getElementById('serviceUrl') as HTMLInputElement;
  const localBaseUrlInput = document.getElementById('localBaseUrl') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;

  MODEL_OPTIONS.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const toggleApiKeyBtn = document.getElementById('toggleApiKey') as HTMLSpanElement;
  
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const btnClose = document.getElementById('btnClose') as HTMLButtonElement;
  
  const statusRow = document.getElementById('statusRow') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;

  let currentMode: 'local' | 'remote' = defaultSettings.mode;
  let debounceTimer: ReturnType<typeof setTimeout>;

  function checkConnection(url: string) {
    const statusEl = document.getElementById('connectionStatus');
    const textEl = statusEl?.querySelector('.status-text');
    
    if (!statusEl || !textEl) return;

    // Reset classes
    statusEl.className = 'connection-status checking';
    textEl.textContent = 'Checking connection...';

    const pingUrl = url.endsWith('/') ? `${url}ping` : `${url}/ping`;

    fetch(pingUrl)
      .then(res => {
        if (res.ok) {
          statusEl.className = 'connection-status success';
          textEl.textContent = 'Service connected';
        } else {
          throw new Error('Service error');
        }
      })
      .catch(() => {
        statusEl.className = 'connection-status error';
        textEl.textContent = 'Connection failed';
      });
  }

  // Load settings — all from local storage, API key is obfuscated
  chrome.storage.local.get(['mode', 'serviceUrl', 'localBaseUrl', 'model', 'apiKeyEncoded'], (result: { [key: string]: any }) => {
    const settings = { ...defaultSettings, ...result };

    setMode(settings.mode);
    serviceUrlInput.value = settings.serviceUrl || defaultSettings.serviceUrl;
    localBaseUrlInput.value = settings.localBaseUrl || defaultSettings.localBaseUrl;
    updateUrlStatus();
    modelSelect.value = settings.model || defaultSettings.model;
    apiKeyInput.value = result.apiKeyEncoded ? deobfuscateApiKey(result.apiKeyEncoded) : '';

    if (settings.mode === 'remote') {
      checkConnection(serviceUrlInput.value);
    }
  });

  function updateUrlStatus() {
    const isCustom = localBaseUrlInput.value.trim() !== DEFAULT_LOCAL_BASE_URL;
    if (isCustom) {
      localBaseUrlInput.style.borderColor = '#4285f4'; // Google Blue
      localBaseUrlInput.title = "Custom Base URL Active";
    } else {
      localBaseUrlInput.style.borderColor = '';
      localBaseUrlInput.title = "Default Google Base URL";
    }
  }

  localBaseUrlInput.addEventListener('input', updateUrlStatus);


  // Mode Switching
  function setMode(mode: 'local' | 'remote') {
    currentMode = mode;
    if (mode === 'remote') {
      modeServiceBtn.classList.add('active');
      modeLocalBtn.classList.remove('active');
      serviceFields.style.display = 'block';
      localFields.style.display = 'none';
      checkConnection(serviceUrlInput.value);
    } else {
      modeServiceBtn.classList.remove('active');
      modeLocalBtn.classList.add('active');
      serviceFields.style.display = 'none';
      localFields.style.display = 'block';
    }
  }

  modeServiceBtn.addEventListener('click', () => setMode('remote'));
  modeLocalBtn.addEventListener('click', () => setMode('local'));

  // Service URL Input Listener
  serviceUrlInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkConnection(serviceUrlInput.value.trim());
    }, 500);
  });

  // Toggle API Key Visibility
  toggleApiKeyBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  // Close Popup
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      window.close();
    });
  }

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const settings: Settings = {
      mode: currentMode,
      apiKey: apiKeyInput.value.trim(),
      serviceUrl: serviceUrlInput.value.trim(),
      localBaseUrl: localBaseUrlInput.value.trim() || DEFAULT_LOCAL_BASE_URL,
      model: modelSelect.value
    };

    // Validate URLs
    try {
      new URL(settings.serviceUrl);
      new URL(settings.localBaseUrl);
    } catch (e) {
      statusRow.style.display = 'flex';
      statusText.textContent = 'Invalid URL format';
      statusRow.classList.add('error');
      setTimeout(() => { statusRow.style.display = 'none'; statusRow.classList.remove('error'); }, 2000);
      return;
    }

    if (currentMode === 'local') {
      if (!settings.apiKey) {
        // Show error status
        statusRow.style.display = 'flex';
        statusText.textContent = 'Please enter an API key';
        statusRow.classList.add('error');
        
        setTimeout(() => {
          statusRow.style.display = 'none';
          statusRow.classList.remove('error');
        }, 2000);
        return;
      }
    }

    // Store API key encoded in local storage (persistent, obfuscated)
    const { apiKey, ...persistentSettings } = settings;
    const storageData = {
      ...persistentSettings,
      apiKeyEncoded: apiKey ? obfuscateApiKey(apiKey) : ''
    };

    chrome.storage.local.set(storageData, () => {
      if (chrome.runtime.lastError) {
        statusRow.style.display = 'flex';
        statusText.textContent = 'Error saving settings';
        statusRow.classList.add('error');
        setTimeout(() => { statusRow.style.display = 'none'; statusRow.classList.remove('error'); }, 2000);
        return;
      }

      statusRow.style.display = 'flex';
      statusText.textContent = 'Settings saved';
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      setTimeout(() => { statusRow.style.display = 'none'; saveBtn.textContent = 'Save Settings'; saveBtn.classList.remove('saved'); }, 2000);
    });
  });
});
