export interface PopupElements {
  providerSelect: HTMLSelectElement;
  apiProviderSelect: HTMLSelectElement;
  customUrlGroup: HTMLDivElement;
  customBaseUrlInput: HTMLInputElement;
  modelSelect: HTMLSelectElement;
  apiKeyGroup: HTMLDivElement;
  apiKeyInput: HTMLInputElement;
  toggleApiKeyBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
  btnClose: HTMLButtonElement;
  statusRow: HTMLDivElement;
  statusText: HTMLSpanElement;
  starCount: HTMLSpanElement;
  starRefreshBtn: HTMLButtonElement;
  providerIntroTitle: HTMLDivElement;
  onboardingEl: HTMLDivElement;
  settingsBodyEl: HTMLDivElement;
  redactTagsEl: HTMLDivElement;
  redactInput: HTMLInputElement;
  redactAddBtn: HTMLButtonElement;
  redactRecommendedBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  exportIncludeKeys: HTMLInputElement;
  importFile: HTMLInputElement;
  importStatusRow: HTMLDivElement;
  importStatusText: HTMLSpanElement;
  advancedDetails: HTMLDetailsElement;
}

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function getPopupElements(): PopupElements {
  return {
    providerSelect: byId('providerSelect'),
    apiProviderSelect: byId('apiProvider'),
    customUrlGroup: byId('customUrlGroup'),
    customBaseUrlInput: byId('customBaseUrl'),
    modelSelect: byId('modelSelect'),
    apiKeyGroup: byId('apiKeyGroup'),
    apiKeyInput: byId('apiKey'),
    toggleApiKeyBtn: byId('toggleApiKey'),
    saveBtn: byId('saveBtn'),
    btnClose: byId('btnClose'),
    statusRow: byId('statusRow'),
    statusText: byId('statusText'),
    starCount: byId('starCount'),
    starRefreshBtn: byId('starRefreshBtn'),
    providerIntroTitle: byId('providerIntroTitle'),
    onboardingEl: byId('onboarding'),
    settingsBodyEl: byId('settingsBody'),
    redactTagsEl: byId('redactTags'),
    redactInput: byId('redactInput'),
    redactAddBtn: byId('redactAddBtn'),
    redactRecommendedBtn: byId('redactRecommendedBtn'),
    exportBtn: byId('exportBtn'),
    exportIncludeKeys: byId('exportIncludeKeys'),
    importFile: byId('importFile'),
    importStatusRow: byId('importStatusRow'),
    importStatusText: byId('importStatusText'),
    advancedDetails: byId('advancedDetails'),
  };
}
