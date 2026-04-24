import { el } from './dom';
import { icon } from './icons';
import { handleGenerate } from './generation';
import { openSettingsModal } from './settings-modal';
import { getTitleInput, getBodyInput, isExistingPrPage } from './page-state';

const OBSERVER_DEBOUNCE_MS = 200;
const PRIMARY_WRAPPER_ID = 'pr-please-wrapper';
const EDIT_WRAPPER_ID = 'pr-please-edit-wrapper';

function buildButtonRow(wrapperId: string): { wrapper: HTMLDivElement } {
  const wrapper = el('div', { id: wrapperId, class: 'pr-please-wrapper' });
  const row = el('div', { class: 'prp-row' });
  const generateBtn = el('button', { type: 'button', class: 'prp-btn', id: 'prp-generate-btn' }, [
    icon('sparkle'),
    ' Generate with AI',
  ]);
  const settingsBtn = el(
    'button',
    { type: 'button', class: 'prp-settings-btn', id: 'prp-settings-btn', title: 'Settings' },
    [icon('gear')]
  );
  row.appendChild(generateBtn);
  row.appendChild(settingsBtn);
  wrapper.appendChild(row);
  generateBtn.addEventListener('click', handleGenerate);
  settingsBtn.addEventListener('click', openSettingsModal);
  return { wrapper };
}

function injectIntoCreateForm(titleInput: HTMLInputElement) {
  if (document.getElementById(PRIMARY_WRAPPER_ID)) return;
  const { wrapper } = buildButtonRow(PRIMARY_WRAPPER_ID);
  const textExpander = titleInput.closest('text-expander');
  (textExpander || titleInput).insertAdjacentElement('afterend', wrapper);
}

function injectIntoEditForm() {
  if (!isExistingPrPage() || document.getElementById(EDIT_WRAPPER_ID)) return;
  const bodyTextarea = getBodyInput();
  if (!bodyTextarea) return;

  const form = bodyTextarea.closest('form');
  if (form && form.querySelector(`#${PRIMARY_WRAPPER_ID}`)) return;

  const { wrapper } = buildButtonRow(EDIT_WRAPPER_ID);
  const actionRow = form?.querySelector(
    '.form-actions, .comment-form-actions, [class*="actions"]'
  );
  if (actionRow) {
    actionRow.insertAdjacentElement('beforebegin', wrapper);
  } else {
    bodyTextarea.insertAdjacentElement('afterend', wrapper);
  }
}

export function injectButton() {
  const titleInput = getTitleInput();
  if (titleInput) {
    injectIntoCreateForm(titleInput);
    return;
  }
  injectIntoEditForm();
}

export function startInjectionObserver() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(injectButton, OBSERVER_DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
