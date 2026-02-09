interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
  model: string;
}

const defaultSettings: Settings = {
  mode: 'remote', // Default to remote/service as per design doc
  apiKey: '',
  serviceUrl: 'http://localhost:3000',
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

  // Load settings
  chrome.storage.local.get(['mode', 'apiKey', 'serviceUrl', 'model'], (result: { [key: string]: any }) => {
    const settings = { ...defaultSettings, ...result };
    
    // Set Mode
    setMode(settings.mode);

    // Set Values
    serviceUrlInput.value = settings.serviceUrl || defaultSettings.serviceUrl;
    apiKeyInput.value = settings.apiKey || '';
    modelSelect.value = settings.model || defaultSettings.model;
  });

  // Mode Switching
  function setMode(mode: 'local' | 'remote') {
    currentMode = mode;
    if (mode === 'remote') {
      modeServiceBtn.classList.add('active');
      modeLocalBtn.classList.remove('active');
      serviceFields.style.display = 'block';
      localFields.style.display = 'none';
    } else {
      modeServiceBtn.classList.remove('active');
      modeLocalBtn.classList.add('active');
      serviceFields.style.display = 'none';
      localFields.style.display = 'block';
    }
  }

  modeServiceBtn.addEventListener('click', () => setMode('remote'));
  modeLocalBtn.addEventListener('click', () => setMode('local'));

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

    chrome.storage.local.set(settings, () => {
      // Show saved status
      statusRow.style.display = 'flex';
      statusText.textContent = 'Settings saved';
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');

      setTimeout(() => {
        statusRow.style.display = 'none';
        saveBtn.textContent = 'Save Settings';
        saveBtn.classList.remove('saved');
      }, 2000);
    });
  });
});
