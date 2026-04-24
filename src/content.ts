import { injectStylesheet } from './content/styles';
import { handleGenerate } from './content/generation';
import { injectButton, startInjectionObserver } from './content/inject';

injectStylesheet();
startInjectionObserver();
injectButton();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === 'TRIGGER_GENERATE') handleGenerate();
});
