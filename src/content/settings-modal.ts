import {
  loadSettings,
  saveSettings,
  obfuscateApiKey,
  deobfuscateApiKey,
  type StoredSettings,
} from '../utils';
import { PROVIDERS, isProviderId, type ProviderId } from '../providers';
import { el } from './dom';
import { icon } from './icons';

type EndpointChoice = 'default' | 'custom';

const SAVED_CLOSE_DELAY_MS = 1000;
const RECOMMENDED = ['.env*', 'secrets/**', '*.pem', '*.key', '*.cert'];

interface SettingsElements {
  overlay: HTMLDivElement;
  introTitle: HTMLDivElement;
  providerSelect: HTMLSelectElement;
  endpointSelect: HTMLSelectElement;
  customUrlGroup: HTMLDivElement;
  baseUrlInput: HTMLInputElement;
  modelSelect: HTMLSelectElement;
  apiKeyGroup: HTMLDivElement;
  apiKeyInput: HTMLInputElement;
  tagWrapper: HTMLDivElement;
  tagInput: HTMLInputElement;
  tagAddBtn: HTMLButtonElement;
  tagRecommBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
}

interface HeaderBits {
  header: HTMLDivElement;
  title: HTMLDivElement;
  closeBtn: HTMLButtonElement;
}

function buildHeader(): HeaderBits {
  const header = el('div', { class: 'prp-modal-header' });
  const title = el('div', { class: 'prp-modal-title' }, [icon('sparkle'), ' PR-Please Settings']);
  const closeBtn = el('button', { class: 'prp-close-btn', id: 'prp-modal-close' }, [icon('close')]);
  header.appendChild(title);
  header.appendChild(closeBtn);
  return { header, title, closeBtn };
}

function buildIntro(): { intro: HTMLDivElement; title: HTMLDivElement } {
  const intro = el('div', { class: 'prp-intro' });
  const title = el('div', { class: 'prp-intro-title' }, ['AI Provider']);
  intro.appendChild(title);
  intro.appendChild(
    el('div', { class: 'prp-intro-desc' }, ['Generate PR content directly from your browser.'])
  );
  return { intro, title };
}

function buildProviderGroup(): { group: HTMLDivElement; select: HTMLSelectElement } {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(el('label', { class: 'prp-label', for: 'prp-provider' }, ['Provider']));
  const select = el('select', { class: 'prp-select', id: 'prp-provider' });
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    select.appendChild(el('option', { value: id }, [PROVIDERS[id].label]));
  }
  group.appendChild(select);
  group.appendChild(
    el('div', { class: 'prp-hint' }, ['Each provider keeps its own API key and model.'])
  );
  return { group, select };
}

function buildEndpointGroup(): {
  group: HTMLDivElement;
  select: HTMLSelectElement;
  customGroup: HTMLDivElement;
  customInput: HTMLInputElement;
} {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(
    el('label', { class: 'prp-label', for: 'prp-api-provider' }, ['API Endpoint'])
  );
  const select = el('select', { class: 'prp-select', id: 'prp-api-provider' });
  select.appendChild(el('option', { value: 'default' }, ['Official']));
  select.appendChild(el('option', { value: 'custom' }, ['Custom URL']));
  group.appendChild(select);
  group.appendChild(
    el('div', { class: 'prp-hint' }, ['Where requests are sent. Choose Custom for a proxy.'])
  );

  const customGroup = el('div', { class: 'prp-form-group', id: 'prp-custom-url-group' });
  customGroup.hidden = true;
  customGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-base-url' }, ['Custom URL']));
  const customInput = el('input', {
    class: 'prp-input',
    id: 'prp-base-url',
    type: 'url',
    placeholder: 'https://your-proxy.example.com',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  customGroup.appendChild(customInput);
  customGroup.appendChild(
    el('div', { class: 'prp-hint' }, ['Must include the scheme (https:// or http://).'])
  );
  return { group, select, customGroup, customInput };
}

function buildModelGroup(): { group: HTMLDivElement; select: HTMLSelectElement } {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(el('label', { class: 'prp-label', for: 'prp-model-select' }, ['Model']));
  const select = el('select', { class: 'prp-select', id: 'prp-model-select' });
  group.appendChild(select);
  return { group, select };
}

function buildApiKeyGroup(): { group: HTMLDivElement; input: HTMLInputElement } {
  const group = el('div', { class: 'prp-form-group', id: 'prp-api-key-group' });
  group.appendChild(el('label', { class: 'prp-label', for: 'prp-api-key' }, ['API Key']));
  const input = el('input', {
    class: 'prp-input',
    type: 'password',
    id: 'prp-api-key',
    placeholder: 'Enter your API key',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  group.appendChild(input);
  group.appendChild(
    el('div', { class: 'prp-hint' }, ['Stored locally in your browser, never synced'])
  );
  return { group, input };
}

function buildRedactGroup(): {
  group: HTMLDivElement;
  wrapper: HTMLDivElement;
  input: HTMLInputElement;
  addBtn: HTMLButtonElement;
  recommBtn: HTMLButtonElement;
} {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(el('label', { class: 'prp-label' }, ['Diff Redaction']));
  const wrapper = el('div', { class: 'prp-tag-wrapper' });
  const addRow = el('div', { class: 'prp-tag-add-row' });
  const input = el('input', {
    class: 'prp-tag-input',
    type: 'text',
    placeholder: 'e.g. secrets/**, *.pem',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const addBtn = el('button', { type: 'button', class: 'prp-tag-btn' }, ['Add']);
  const recommBtn = el('button', { type: 'button', class: 'prp-tag-btn' }, ['Recommended']);
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  addRow.appendChild(recommBtn);
  group.appendChild(wrapper);
  group.appendChild(addRow);
  group.appendChild(
    el('div', { class: 'prp-hint' }, [
      'Files matching these patterns are redacted before the diff is sent.',
    ])
  );
  return { group, wrapper, input, addBtn, recommBtn };
}

function buildSettingsDom(): SettingsElements {
  const overlay = el('div', { id: 'prp-settings-modal', class: 'prp-modal-overlay' });
  const modal = el('div', { class: 'prp-modal' });
  const { header, title: introTitleHeader, closeBtn } = buildHeader();

  const body = el('div', { class: 'prp-modal-body' });
  const { intro, title: introTitle } = buildIntro();
  body.appendChild(intro);

  const provider = buildProviderGroup();
  const endpoint = buildEndpointGroup();
  const model = buildModelGroup();
  const apiKey = buildApiKeyGroup();
  const redact = buildRedactGroup();
  const saveBtn = el('button', { class: 'prp-save-btn', id: 'prp-save-btn' }, ['Save Settings']);

  body.appendChild(provider.group);
  body.appendChild(endpoint.group);
  body.appendChild(endpoint.customGroup);
  body.appendChild(model.group);
  body.appendChild(apiKey.group);
  body.appendChild(redact.group);
  body.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // `introTitleHeader` is unused — the inline intro block holds the title we update.
  void introTitleHeader;

  return {
    overlay,
    introTitle,
    providerSelect: provider.select,
    endpointSelect: endpoint.select,
    customUrlGroup: endpoint.customGroup,
    baseUrlInput: endpoint.customInput,
    modelSelect: model.select,
    apiKeyGroup: apiKey.group,
    apiKeyInput: apiKey.input,
    tagWrapper: redact.wrapper,
    tagInput: redact.input,
    tagAddBtn: redact.addBtn,
    tagRecommBtn: redact.recommBtn,
    saveBtn,
    closeBtn,
  };
}

function resolveEndpointChoice(baseUrl: string, defaultBaseUrl: string): EndpointChoice {
  const trimmed = (baseUrl || '').trim().replace(/\/$/, '');
  if (!trimmed || trimmed === defaultBaseUrl) return 'default';
  return 'custom';
}

function applyEndpointChoice(
  elements: SettingsElements,
  providerId: ProviderId,
  choice: EndpointChoice,
  storedBaseUrl?: string
) {
  const provider = PROVIDERS[providerId];
  elements.endpointSelect.value = choice;
  elements.customUrlGroup.hidden = choice !== 'custom';
  if (choice === 'custom' && storedBaseUrl && storedBaseUrl !== provider.defaultBaseUrl) {
    elements.baseUrlInput.value = storedBaseUrl;
  }
}

function renderForProvider(
  elements: SettingsElements,
  settings: StoredSettings,
  providerId: ProviderId
) {
  const provider = PROVIDERS[providerId];
  const config = settings.providers[providerId];
  elements.providerSelect.value = providerId;
  elements.introTitle.textContent = provider.label;

  elements.modelSelect.textContent = '';
  for (const m of provider.modelOptions) {
    elements.modelSelect.appendChild(el('option', { value: m }, [m]));
  }
  elements.modelSelect.value = provider.modelOptions.includes(config.model)
    ? config.model
    : provider.defaultModel;

  elements.baseUrlInput.value = '';
  const baseUrl = config.baseUrl || provider.defaultBaseUrl;
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

function createRedactController(elements: SettingsElements, initial: string[]) {
  let patterns: string[] = [...initial];

  function render() {
    elements.tagWrapper.textContent = '';
    for (const p of patterns) {
      const chip = el('span', { class: 'prp-tag' }, [p]);
      const removeBtn = el('button', { type: 'button', class: 'prp-tag-remove' }, ['×']);
      removeBtn.addEventListener('click', () => {
        patterns = patterns.filter((x) => x !== p);
        render();
      });
      chip.appendChild(removeBtn);
      elements.tagWrapper.appendChild(chip);
    }
  }

  function add(p: string) {
    const trimmed = p.trim();
    if (!trimmed || patterns.includes(trimmed)) return;
    patterns.push(trimmed);
    render();
  }

  elements.tagAddBtn.addEventListener('click', () => {
    add(elements.tagInput.value);
    elements.tagInput.value = '';
    elements.tagInput.focus();
  });
  elements.tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(elements.tagInput.value);
      elements.tagInput.value = '';
    }
  });
  elements.tagRecommBtn.addEventListener('click', () => {
    RECOMMENDED.forEach(add);
  });
  render();

  return { get: () => patterns };
}

function resolveCustomUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return raw.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function closeSettingsModal() {
  document.getElementById('prp-settings-modal')?.remove();
}

async function handleSave(
  elements: SettingsElements,
  settings: StoredSettings,
  providerId: ProviderId,
  redactPatterns: string[]
) {
  const provider = PROVIDERS[providerId];
  const apiKey = elements.apiKeyInput.value.trim();
  const model = elements.modelSelect.value;
  const choice = elements.endpointSelect.value as EndpointChoice;

  let baseUrl: string;
  if (choice === 'default') {
    baseUrl = provider.defaultBaseUrl;
  } else {
    const resolved = resolveCustomUrl(elements.baseUrlInput.value.trim());
    if (!resolved) {
      alert('Invalid Custom URL. It must start with http:// or https://');
      return;
    }
    baseUrl = resolved;
  }

  if (provider.requiresApiKey && !apiKey) {
    alert(`Please enter a ${provider.label} API key.`);
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
    redactPatterns,
  };

  try {
    await saveSettings(updated);
    settings.provider = updated.provider;
    settings.providers = updated.providers;
    settings.redactPatterns = updated.redactPatterns;
    elements.saveBtn.textContent = 'Saved!';
    setTimeout(closeSettingsModal, SAVED_CLOSE_DELAY_MS);
  } catch {
    alert('Error saving settings.');
  }
}

export async function openSettingsModal() {
  if (document.getElementById('prp-settings-modal')) return;
  if (!chrome?.storage?.local) {
    alert('Extension context invalidated. Please refresh the page.');
    return;
  }

  const settings = await loadSettings();
  let currentProviderId: ProviderId = settings.provider;

  const elements = buildSettingsDom();
  const redact = createRedactController(elements, settings.redactPatterns);

  renderForProvider(elements, settings, currentProviderId);

  elements.providerSelect.addEventListener('change', () => {
    if (!isProviderId(elements.providerSelect.value)) return;
    currentProviderId = elements.providerSelect.value;
    renderForProvider(elements, settings, currentProviderId);
  });

  elements.endpointSelect.addEventListener('change', () => {
    applyEndpointChoice(
      elements,
      currentProviderId,
      elements.endpointSelect.value as EndpointChoice
    );
    if (elements.endpointSelect.value === 'custom') elements.baseUrlInput.focus();
  });

  elements.closeBtn.addEventListener('click', closeSettingsModal);
  elements.overlay.addEventListener('click', (e) => {
    if (e.target === elements.overlay) closeSettingsModal();
  });
  elements.saveBtn.addEventListener('click', () => {
    handleSave(elements, settings, currentProviderId, redact.get());
  });
}
