import { DEFAULT_PROVIDER, loadSettings, type StoredSettings } from './utils';
import { type ProviderId } from './providers';
import { getPopupElements } from './popup/elements';
import { loadStarCount } from './popup/star';
import { setupOnboarding } from './popup/onboarding';
import { setupSettingsForm, renderForProvider } from './popup/settings-form';
import { setupRedactControls } from './popup/redact';
import { setupImportExport } from './popup/import-export';
import { setupAdvancedToggle } from './popup/advanced';

async function init() {
  const elements = getPopupElements();
  loadStarCount(elements.starCount);

  const settings: StoredSettings = await loadSettings();
  let currentProviderId: ProviderId = settings.provider || DEFAULT_PROVIDER;

  elements.starRefreshBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    loadStarCount(elements.starCount, true);
  });

  setupOnboarding(
    {
      elements,
      settings,
      onComplete: (providerId) => {
        currentProviderId = providerId;
        renderForProvider(elements, settings, providerId);
      },
    },
    currentProviderId
  );

  const redact = setupRedactControls(elements, settings.redactPatterns);

  setupSettingsForm({
    elements,
    settings,
    getRedactPatterns: () => redact.get(),
    getCurrentProviderId: () => currentProviderId,
    setCurrentProviderId: (id) => {
      currentProviderId = id;
    },
  });

  setupImportExport({
    elements,
    settings,
    redact,
    setCurrentProviderId: (id) => {
      currentProviderId = id;
    },
  });

  setupAdvancedToggle(elements);
}

document.addEventListener('DOMContentLoaded', init);
