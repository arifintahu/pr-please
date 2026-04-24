import type { PopupElements } from './elements';

const STORAGE_KEY = 'advancedOpen';

export function setupAdvancedToggle(elements: PopupElements) {
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    elements.advancedDetails.open = Boolean(res[STORAGE_KEY]);
  });

  elements.advancedDetails.addEventListener('toggle', () => {
    chrome.storage.local.set({ [STORAGE_KEY]: elements.advancedDetails.open });
  });
}
