interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
  model: string;
}

const DEFAULT_SERVICE_URL = 'http://localhost:3000';

const defaultSettings: Settings = {
  mode: 'remote',
  apiKey: '',
  serviceUrl: DEFAULT_SERVICE_URL,
  model: 'gemini-2.5-flash'
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const modeServiceBtn = document.getElementById('modeService') as HTMLButtonElement;
  const modeLocalBtn = document.getElementById('modeLocal') as HTMLButtonElement;
  const serviceFields = document.getElementById('serviceFields') as HTMLDivElement;
  const localFields = document.getElementById('localFields') as HTMLDivElement;
  
  const serviceUrlInput = document.getElementById('serviceUrl') as HTMLInputElement;
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
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

  // Load settings — API key from session storage, rest from local storage
  chrome.storage.local.get(['mode', 'serviceUrl', 'model'], (result: { [key: string]: any }) => {
    const settings = { ...defaultSettings, ...result };

    setMode(settings.mode);
    serviceUrlInput.value = settings.serviceUrl || defaultSettings.serviceUrl;
    modelSelect.value = settings.model || defaultSettings.model;

    if (settings.mode === 'remote') {
      checkConnection(serviceUrlInput.value);
    }

    // Load API key from session storage (cleared on browser close)
    chrome.storage.session.get(['apiKey'], (sessionResult: { [key: string]: any }) => {
      apiKeyInput.value = sessionResult.apiKey || '';
    });
  });

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
      model: modelSelect.value
    };

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

    // Store API key separately in session storage (cleared on browser close)
    const { apiKey, ...persistentSettings } = settings;
    chrome.storage.session.set({ apiKey }, () => {
      if (chrome.runtime.lastError) {
        statusRow.style.display = 'flex';
        statusText.textContent = 'Error saving API key';
        statusRow.classList.add('error');
        setTimeout(() => { statusRow.style.display = 'none'; statusRow.classList.remove('error'); }, 2000);
        return;
      }

      chrome.storage.local.set(persistentSettings, () => {
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
});
