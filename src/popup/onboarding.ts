import { obfuscateApiKey, saveSettings, type StoredSettings } from '../utils';
import { PROVIDERS, isProviderId, type ProviderId } from '../providers';
import type { PopupElements } from './elements';

type OnboardStep = 1 | 2 | 3 | 'ollama';
const STEP_IDS: Record<OnboardStep, string> = {
  1: 'onboardStep1',
  2: 'onboardStep2',
  3: 'onboardStep3',
  ollama: 'onboardStepOllama',
};

const PROVIDER_KEY_LINKS: Record<ProviderId, string> = {
  gemini: 'https://ai.google.dev/gemini-api/docs/api-key',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  ollama: '',
};

const PROVIDER_KEY_DESCS: Record<ProviderId, string> = {
  gemini: 'Google Gemini has a free tier. Click below to create a key at Google AI Studio.',
  openai: "You'll need an OpenAI account. Click below to create a key.",
  anthropic: "You'll need an Anthropic account. Click below to create a key.",
  ollama: '',
};

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function showOnboardStep(step: OnboardStep) {
  for (const id of Object.values(STEP_IDS)) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  const target = document.getElementById(STEP_IDS[step]);
  if (target) target.hidden = false;
}

function updateOnboardKeyStep(provider: ProviderId) {
  byId('onboardKeyTitle').textContent = `Get your ${PROVIDERS[provider].label} API key`;
  byId('onboardKeyDesc').textContent = PROVIDER_KEY_DESCS[provider];
  const link = byId<HTMLAnchorElement>('onboardKeyLink');
  link.href = PROVIDER_KEY_LINKS[provider];
  link.textContent = `Get ${PROVIDERS[provider].label} API key →`;
}

interface OnboardingContext {
  elements: PopupElements;
  settings: StoredSettings;
  onComplete: (providerId: ProviderId) => void;
}

function show(elements: PopupElements) {
  elements.onboardingEl.hidden = false;
  elements.settingsBodyEl.hidden = true;
  showOnboardStep(1);
}

function dismiss(elements: PopupElements) {
  elements.onboardingEl.hidden = true;
  elements.settingsBodyEl.hidden = false;
}

function wireStepNav(
  ctx: OnboardingContext,
  getSelected: () => ProviderId,
  setSelected: (id: ProviderId) => void
) {
  byId<HTMLButtonElement>('onboardStep1Next').addEventListener('click', () => {
    const sel = byId<HTMLSelectElement>('onboardProvider');
    const picked: ProviderId = isProviderId(sel.value) ? sel.value : 'gemini';
    setSelected(picked);
    if (picked === 'ollama') {
      showOnboardStep('ollama');
    } else {
      updateOnboardKeyStep(picked);
      showOnboardStep(2);
    }
  });

  byId<HTMLButtonElement>('onboardStep2Next').addEventListener('click', () => showOnboardStep(3));
  byId<HTMLButtonElement>('onboardStep2Back').addEventListener('click', () => showOnboardStep(1));
  byId<HTMLButtonElement>('onboardStep3Back').addEventListener('click', () => showOnboardStep(2));
  byId<HTMLButtonElement>('onboardOllamaBack').addEventListener('click', () => showOnboardStep(1));

  byId<HTMLButtonElement>('onboardOllamaDone').addEventListener('click', () => {
    dismiss(ctx.elements);
    ctx.onComplete(getSelected());
  });
}

function wireApiKeyReveal() {
  const toggle = byId<HTMLButtonElement>('onboardToggleKey');
  const input = byId<HTMLInputElement>('onboardApiKey');
  toggle.addEventListener('click', () => {
    const revealing = input.type === 'password';
    input.type = revealing ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(revealing));
  });
}

async function saveOnboardApiKey(
  ctx: OnboardingContext,
  selected: ProviderId,
  rawKey: string
) {
  const provider = PROVIDERS[selected];
  const updated: StoredSettings = {
    ...ctx.settings,
    provider: selected,
    providers: {
      ...ctx.settings.providers,
      [selected]: {
        ...ctx.settings.providers[selected],
        apiKeyEncoded: obfuscateApiKey(rawKey),
        baseUrl: provider.defaultBaseUrl,
        model: provider.defaultModel,
      },
    },
  };
  await saveSettings(updated);
  Object.assign(ctx.settings, updated);
  dismiss(ctx.elements);
  ctx.onComplete(selected);
}

export function setupOnboarding(ctx: OnboardingContext, currentProviderId: ProviderId) {
  let selected: ProviderId = currentProviderId;
  wireStepNav(
    ctx,
    () => selected,
    (id) => {
      selected = id;
    }
  );
  wireApiKeyReveal();

  byId<HTMLButtonElement>('onboardSave').addEventListener('click', async () => {
    const input = byId<HTMLInputElement>('onboardApiKey');
    const key = input.value.trim();
    if (!key) {
      input.focus();
      return;
    }
    await saveOnboardApiKey(ctx, selected, key);
  });

  for (const id of ['onboardDismiss1', 'onboardDismiss2', 'onboardDismiss3']) {
    document.getElementById(id)?.addEventListener('click', () => dismiss(ctx.elements));
  }

  const activeConfig = ctx.settings.providers[currentProviderId];
  const needsOnboarding =
    PROVIDERS[currentProviderId].requiresApiKey && !activeConfig.apiKeyEncoded;
  if (needsOnboarding) show(ctx.elements);
}
