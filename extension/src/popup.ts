interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
}

const defaultSettings: Settings = {
  mode: 'local',
  apiKey: '',
  serviceUrl: 'http://localhost:3000'
};

document.addEventListener('DOMContentLoaded', () => {
  const modeRadios = document.querySelectorAll('input[name="mode"]') as NodeListOf<HTMLInputElement>;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const serviceUrlInput = document.getElementById('serviceUrl') as HTMLInputElement;
  const localSettings = document.getElementById('local-settings') as HTMLDivElement;
  const remoteSettings = document.getElementById('remote-settings') as HTMLDivElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load settings
  chrome.storage.local.get(['mode', 'apiKey', 'serviceUrl'], (result: { [key: string]: any }) => {
    const settings = { ...defaultSettings, ...result };
    
    // Set Mode
    modeRadios.forEach(radio => {
      if (radio.value === settings.mode) {
        radio.checked = true;
      }
    });
    toggleSettings(settings.mode);

    // Set Values
    apiKeyInput.value = settings.apiKey || '';
    serviceUrlInput.value = settings.serviceUrl || 'http://localhost:3000';
  });

  // Toggle Visibility
  function toggleSettings(mode: string) {
    if (mode === 'local') {
      localSettings.classList.remove('hidden');
      remoteSettings.classList.add('hidden');
    } else {
      localSettings.classList.add('hidden');
      remoteSettings.classList.remove('hidden');
    }
  }

  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      toggleSettings(target.value);
    });
  });

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const mode = document.querySelector('input[name="mode"]:checked') as HTMLInputElement;
    const settings: Settings = {
      mode: mode.value as 'local' | 'remote',
      apiKey: apiKeyInput.value.trim(),
      serviceUrl: serviceUrlInput.value.trim()
    };

    chrome.storage.local.set(settings, () => {
      statusDiv.textContent = 'Settings saved!';
      statusDiv.className = 'status success';
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 2000);
    });
  });
});