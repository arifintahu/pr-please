// content.ts
import {
  loadSettings,
  saveSettings,
  obfuscateApiKey,
  deobfuscateApiKey,
  type StoredSettings,
} from './utils';
import { PROVIDERS, isProviderId, type ProviderId } from './providers';

type EndpointChoice = 'default' | 'custom';

// ── Icon Helpers ──
function createSvgIcon(pathData: string, transform?: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  if (transform) path.setAttribute('transform', transform);
  svg.appendChild(path);
  return svg;
}

function createSpinnerIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '8');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '6');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '2');
  circle.setAttribute('stroke-dasharray', '20 12');
  svg.appendChild(circle);
  return svg;
}

const ICON_PATHS = {
  sparkle: 'M7.53 1.282a.5.5 0 01.94 0l.478 1.306a7.492 7.492 0 004.464 4.464l1.305.478a.5.5 0 010 .94l-1.305.478a7.492 7.492 0 00-4.464 4.464l-.478 1.305a.5.5 0 01-.94 0l-.478-1.305a7.492 7.492 0 00-4.464-4.464L1.282 8.47a.5.5 0 010-.94l1.306-.478a7.492 7.492 0 004.464-4.464L7.53 1.282z',
  gear: 'M8 0a8.2 8.2 0 01.701.031C9.444.095 9.99.645 10.16 1.29l.035.133.038.146c.07.3.192.578.352.827a1.5 1.5 0 001.323.753c.257 0 .515-.072.745-.2l.13-.073.134-.079c.572-.348 1.29-.295 1.808.137a8.076 8.076 0 011.416 1.42c.425.515.477 1.225.137 1.795l-.082.14-.076.131a1.5 1.5 0 00.554 2.07c.249.16.527.282.827.352l.146.038.133.035c.646.17 1.196.716 1.26 1.459a8.2 8.2 0 010 1.402c-.064.743-.614 1.289-1.26 1.459l-.133.035-.146.038a2.88 2.88 0 00-.827.352 1.5 1.5 0 00-.554 2.07l.076.131.082.14c.34.57.288 1.28-.137 1.795a8.076 8.076 0 01-1.416 1.42c-.518.432-1.236.485-1.808.137l-.134-.079-.13-.073a1.5 1.5 0 00-2.068.553c-.16.25-.282.528-.352.828l-.038.146-.035.133c-.17.645-.716 1.195-1.459 1.259a8.2 8.2 0 01-1.402 0c-.743-.064-1.289-.614-1.459-1.26l-.035-.132-.038-.146a2.88 2.88 0 00-.352-.828 1.5 1.5 0 00-2.068-.553l-.13.073-.134.079c-.572.348-1.29.295-1.808-.137a8.076 8.076 0 01-1.416-1.42c-.425-.515-.477-1.225-.137-1.795l.082-.14.076-.131a1.5 1.5 0 00-.554-2.07 2.88 2.88 0 00-.827-.352l-.146-.038-.133-.035C.645 9.444.095 8.898.031 8.155a8.2 8.2 0 010-1.402C.095 6.01.645 5.464 1.29 5.294l.133-.035.146-.038c.3-.07.578-.192.827-.352a1.5 1.5 0 00.554-2.07l-.076-.131-.082-.14c-.34-.57-.288-1.28.137-1.795A8.076 8.076 0 014.346.333c.518-.432 1.236-.485 1.808-.137l.134.079.13.073a1.5 1.5 0 002.068-.553c.16-.25.282-.528.352-.828l.038-.146.035-.133C9.081.143 9.627-.407 10.37-.469zM8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  success: 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z',
  error: 'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z',
  close: 'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z',
};

const ICON_TRANSFORMS: Record<string, string> = {
  gear: 'scale(0.72) translate(3,3)',
};

function icon(name: keyof typeof ICON_PATHS): SVGSVGElement {
  return createSvgIcon(ICON_PATHS[name], ICON_TRANSFORMS[name]);
}

// ── Styles ──
const INJECTED_STYLES = `
  .pr-please-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  }

  .prp-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .prp-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    height: 32px;
    background: #238636;
    color: #fff;
    border: 1px solid rgba(27,31,35,0.15);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: 0.2s;
    line-height: 20px;
  }

  .prp-btn:hover { background: #2ea043; }
  .prp-btn:active { transform: scale(0.98); }

  .prp-btn svg { width: 16px; height: 16px; fill: currentColor; }

  .prp-btn.loading {
    background: #21262d;
    cursor: wait;
    pointer-events: none;
    color: #8b949e;
  }

  .prp-btn.loading svg { animation: prp-spin 1s linear infinite; }

  .prp-btn.success { background: #238636; }
  .prp-btn.error { background: #cf222e; }

  @keyframes prp-spin { to { transform: rotate(360deg); } }

  .prp-settings-btn {
    width: 32px; height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #8b949e;
    cursor: pointer;
    transition: 0.2s;
  }

  .prp-settings-btn:hover { background: #30363d; color: #e6edf3; }
  .prp-settings-btn svg { width: 16px; height: 16px; fill: currentColor; }

  /* Settings Modal */
  .prp-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(1,4,9,0.7);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }

  .prp-modal {
    width: 380px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.55);
    overflow: hidden;
    color: #e6edf3;
    animation: prp-pop-in 0.2s ease-out;
  }

  @keyframes prp-pop-in {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  .prp-modal-header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #30363d;
  }

  .prp-modal-title { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
  .prp-modal-title svg { fill: #238636; width: 18px; height: 18px; }

  .prp-close-btn {
    background: transparent; border: none; color: #8b949e; cursor: pointer; padding: 4px;
  }
  .prp-close-btn:hover { color: #e6edf3; }
  .prp-close-btn svg { width: 16px; height: 16px; fill: currentColor; }

  .prp-modal-body { padding: 20px; }

  .prp-intro {
    padding: 12px 14px;
    margin-bottom: 18px;
    background: rgba(35,134,54,0.15);
    border: 1px solid rgba(35,134,54,0.3);
    border-radius: 6px;
  }

  .prp-intro-title { font-size: 13px; font-weight: 600; color: #e6edf3; margin-bottom: 4px; }
  .prp-intro-desc { font-size: 12px; color: #8b949e; line-height: 1.4; }

  .prp-form-group { margin-bottom: 16px; }
  .prp-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #8b949e;
    margin-bottom: 6px;
  }

  .prp-label-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 1px 6px;
    background: #21262d;
    color: #484f58;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .prp-input, .prp-select {
    width: 100%;
    padding: 8px 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    outline: none;
  }

  .prp-input:focus, .prp-select:focus { border-color: #58a6ff; }

  .prp-hint { font-size: 11px; color: #484f58; margin-top: 6px; }

  .prp-save-btn {
    width: 100%;
    padding: 10px;
    background: #238636;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 10px;
  }

  .prp-save-btn:hover { background: #2ea043; }

  /* Tag input */
  .prp-tag-wrapper { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; min-height: 24px; }
  .prp-tag {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 1px 8px 1px 9px;
    background: #21262d; border: 1px solid #30363d; border-radius: 20px;
    font-size: 11px; color: #c9d1d9;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  }
  .prp-tag-remove {
    background: none; border: none; color: #8b949e; cursor: pointer; padding: 0; font-size: 13px; line-height: 1;
  }
  .prp-tag-remove:hover { color: #f85149; }
  .prp-tag-add-row { display: flex; gap: 6px; }
  .prp-tag-input {
    flex: 1; padding: 5px 10px; background: #161b22; border: 1px solid #30363d;
    border-radius: 6px; color: #e6edf3; font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    outline: none;
  }
  .prp-tag-input:focus { border-color: #58a6ff; }
  .prp-tag-btn {
    padding: 5px 10px; background: #21262d; border: 1px solid #30363d; border-radius: 6px;
    color: #c9d1d9; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit;
  }
  .prp-tag-btn:hover { background: #30363d; }

  /* Preview Modal */
  .prp-preview-modal { width: 640px; max-width: calc(100vw - 40px); max-height: calc(100vh - 60px); display: flex; flex-direction: column; }
  .prp-preview-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; flex: 1 1 auto; }
  .prp-preview-title-input {
    width: 100%;
    padding: 8px 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }
  .prp-preview-title-input:focus { border-color: #58a6ff; }
  .prp-preview-body-input {
    width: 100%;
    min-height: 240px;
    max-height: 420px;
    padding: 10px 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    line-height: 1.5;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
  }
  .prp-preview-body-input:focus { border-color: #58a6ff; }
  .prp-preview-body-input[readonly], .prp-preview-title-input[readonly] { background: #0d1117; color: #c9d1d9; cursor: default; }

  .prp-extra-input {
    width: 100%;
    min-height: 52px;
    padding: 8px 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
  }
  .prp-extra-input:focus { border-color: #58a6ff; }

  .prp-preview-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #30363d;
    background: #0d1117;
    flex-wrap: wrap;
  }
  .prp-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
  }
  .prp-action-btn:hover:not(:disabled) { background: #30363d; color: #e6edf3; }
  .prp-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .prp-action-btn.primary { background: #238636; color: #fff; border-color: rgba(27,31,35,0.15); }
  .prp-action-btn.primary:hover:not(:disabled) { background: #2ea043; }
  .prp-action-btn.danger { color: #f85149; }
  .prp-action-btn.danger:hover:not(:disabled) { background: #30363d; color: #ff7b72; }

  .prp-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.4;
  }
  .prp-status.info { background: rgba(56,139,253,0.12); border: 1px solid rgba(56,139,253,0.35); color: #79c0ff; }
  .prp-status.error { background: rgba(248,81,73,0.12); border: 1px solid rgba(248,81,73,0.4); color: #ff7b72; }
  .prp-status svg { width: 14px; height: 14px; fill: currentColor; flex-shrink: 0; }
  .prp-status.info svg { animation: prp-spin 1s linear infinite; }
  .prp-hidden { display: none !important; }

  .prp-variations {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: auto;
    font-size: 12px;
    color: #8b949e;
  }
  .prp-nav-btn {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    line-height: 1;
  }
  .prp-nav-btn:hover:not(:disabled) { background: #30363d; }
  .prp-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .prp-variation-label { min-width: 32px; text-align: center; font-variant-numeric: tabular-nums; }

  .prp-cost {
    font-size: 11px;
    color: #484f58;
    padding: 2px 0 0;
    font-variant-numeric: tabular-nums;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = INJECTED_STYLES;
document.head.appendChild(styleEl);

let generatedData: { title: string; description: string } | null = null;

const MAX_VARIATIONS = 3;
interface Variation { title: string; description: string }
const variations: Variation[] = [];
let variationIndex = -1;

interface PreviewHandles {
  titleInput: HTMLInputElement;
  bodyTextarea: HTMLTextAreaElement;
  extraTextarea: HTMLTextAreaElement;
  status: HTMLDivElement;
  applyBtn: HTMLButtonElement;
  regenBtn: HTMLButtonElement;
  editBtn: HTMLButtonElement;
  discardBtn: HTMLButtonElement;
  overlay: HTMLDivElement;
  setEditable: (editable: boolean) => void;
  close: () => void;
  setResult: (data: { title: string; description: string; costEstimate?: string }) => void;
  setBusy: (busy: boolean) => void;
  setError: (msg: string | null) => void;
}

function getDraftFromPage(): { title: string; body: string } {
  const titleInput = document.querySelector('input[name="pull_request[title]"]') as HTMLInputElement | null;
  const bodyInput = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement | null;
  return {
    title: titleInput?.value ?? '',
    body: bodyInput?.value ?? '',
  };
}

function currentPrUrl(): string {
  return window.location.href.split('?')[0];
}

function extraContextKey(prUrl: string): string {
  return `prp:extra:${prUrl}`;
}

async function loadExtraContext(prUrl: string): Promise<string> {
  if (!chrome?.storage?.session) return '';
  return new Promise((resolve) => {
    chrome.storage.session.get([extraContextKey(prUrl)], (res) => {
      resolve((res?.[extraContextKey(prUrl)] as string) || '');
    });
  });
}

async function saveExtraContext(prUrl: string, value: string): Promise<void> {
  if (!chrome?.storage?.session) return;
  return new Promise((resolve) => {
    chrome.storage.session.set({ [extraContextKey(prUrl)]: value }, () => resolve());
  });
}

function collectCommits(): string[] {
  const commitElements = document.querySelectorAll('.js-commits-list-item p.mb-1 a.markdown-title, .commit-message code a');
  return Array.from(commitElements).map(el => el.textContent?.trim()).filter(Boolean) as string[];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      elem.setAttribute(k, v);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        elem.appendChild(document.createTextNode(child));
      } else {
        elem.appendChild(child);
      }
    }
  }
  return elem;
}

function buildButtonRow(wrapperId: string): { wrapper: HTMLDivElement; generateBtn: HTMLButtonElement; settingsBtn: HTMLButtonElement } {
  const wrapper = el('div', { id: wrapperId, class: 'pr-please-wrapper' }) as HTMLDivElement;
  const row = el('div', { class: 'prp-row' });
  const generateBtn = el('button', { type: 'button', class: 'prp-btn', id: 'prp-generate-btn' }, [
    icon('sparkle'), ' Generate with AI',
  ]) as HTMLButtonElement;
  const settingsBtn = el('button', { type: 'button', class: 'prp-settings-btn', id: 'prp-settings-btn', title: 'Settings' }, [
    icon('gear'),
  ]) as HTMLButtonElement;
  row.appendChild(generateBtn);
  row.appendChild(settingsBtn);
  wrapper.appendChild(row);
  generateBtn.addEventListener('click', handleGenerate);
  settingsBtn.addEventListener('click', openSettingsModal);
  return { wrapper, generateBtn, settingsBtn };
}

function isExistingPrPage(): boolean {
  return /\/pull\/\d+/.test(window.location.pathname) && !/\/compare\//.test(window.location.pathname);
}

function injectButton() {
  const titleInput = document.querySelector('input[name="pull_request[title]"]') as HTMLInputElement | null;

  if (titleInput && !document.getElementById('pr-please-wrapper')) {
    // Create-PR form or existing PR edit form with title visible.
    const { wrapper } = buildButtonRow('pr-please-wrapper');
    const textExpander = titleInput.closest('text-expander');
    (textExpander || titleInput).insertAdjacentElement('afterend', wrapper);
    return;
  }

  // Fallback: existing PR body-only edit form (title input not found but textarea is).
  if (isExistingPrPage() && !document.getElementById('pr-please-edit-wrapper')) {
    const bodyTextarea = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement | null;
    if (!bodyTextarea) return;

    // Don't double-inject if the primary wrapper is already in the same form.
    const form = bodyTextarea.closest('form');
    if (form && form.querySelector('#pr-please-wrapper')) return;

    const { wrapper } = buildButtonRow('pr-please-edit-wrapper');

    // Prefer injecting before the form's action buttons row, fall back to after textarea.
    const actionRow = form?.querySelector('.form-actions, .comment-form-actions, [class*="actions"]');
    if (actionRow) {
      actionRow.insertAdjacentElement('beforebegin', wrapper);
    } else {
      bodyTextarea.insertAdjacentElement('afterend', wrapper);
    }
  }
}

async function handleGenerate() {
  if (document.getElementById('prp-preview-modal')) return;
  generatedData = null;
  variations.length = 0;
  variationIndex = -1;
  const prUrl = currentPrUrl();
  const savedExtra = await loadExtraContext(prUrl);
  const preview = openPreviewModal(savedExtra);
  await runGeneration(preview, { useCachedDiff: false });
}

async function runGeneration(preview: PreviewHandles, opts: { useCachedDiff: boolean }) {
  preview.setBusy(true);
  preview.setError(null);

  try {
    if (!chrome?.runtime?.sendMessage) {
      throw new Error('Extension context invalidated. Please refresh the page.');
    }

    const prUrl = currentPrUrl();
    const extraContext = preview.extraTextarea.value.trim();
    await saveExtraContext(prUrl, extraContext);

    const response = await chrome.runtime.sendMessage({
      action: 'GENERATE_PR',
      commits: collectCommits(),
      prUrl,
      extraContext,
      userDraft: getDraftFromPage(),
      useCachedDiff: opts.useCachedDiff,
    });

    if (!response) {
      throw new Error('No response from background service worker.');
    }
    if (response.error) {
      throw new Error(response.error);
    }

    generatedData = { title: response.title, description: response.description };
    preview.setResult({ ...generatedData, costEstimate: response.costEstimate });
  } catch (err: any) {
    console.error('PR-Please generation error:', err);
    const safeMessage = (err?.message && !String(err.message).includes('<'))
      ? err.message
      : 'An unexpected error occurred. Check the console for details.';
    preview.setError(safeMessage);
  } finally {
    preview.setBusy(false);
  }
}

function applyResult(data: { title: string; description: string }) {
  const titleInput = document.querySelector('input[name="pull_request[title]"]') as HTMLInputElement | null;
  const bodyInput = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement | null;

  if (titleInput && shouldOverwrite(titleInput.value, data.title)) {
    titleInput.value = data.title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (bodyInput && shouldOverwrite(bodyInput.value, data.description)) {
    bodyInput.value = data.description;
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function shouldOverwrite(existing: string, generated: string): boolean {
  const ex = existing.trim();
  const gen = generated.trim();
  if (!ex) return true;
  if (!gen) return false;
  return gen.length >= ex.length;
}

function openPreviewModal(initialExtra: string): PreviewHandles {
  const overlay = el('div', { id: 'prp-preview-modal', class: 'prp-modal-overlay' });
  const modal = el('div', { class: 'prp-modal prp-preview-modal' });

  const header = el('div', { class: 'prp-modal-header' });
  const titleDiv = el('div', { class: 'prp-modal-title' }, [icon('sparkle'), ' PR-Please Preview']);
  const closeBtn = el('button', { class: 'prp-close-btn', type: 'button' }, [icon('close')]);
  header.appendChild(titleDiv);
  header.appendChild(closeBtn);

  const body = el('div', { class: 'prp-preview-body' });

  const status = el('div', { class: 'prp-status info' }) as HTMLDivElement;
  status.appendChild(createSpinnerIcon());
  status.appendChild(document.createTextNode(' Generating…'));
  body.appendChild(status);

  const titleGroup = el('div', { class: 'prp-form-group' });
  titleGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-preview-title' }, ['Title']));
  const titleInput = el('input', {
    class: 'prp-preview-title-input',
    id: 'prp-preview-title',
    type: 'text',
    placeholder: 'Generated title will appear here…',
    readonly: '',
    autocomplete: 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;
  titleGroup.appendChild(titleInput);
  body.appendChild(titleGroup);

  const bodyGroup = el('div', { class: 'prp-form-group' });
  bodyGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-preview-body' }, ['Description']));
  const bodyTextarea = el('textarea', {
    class: 'prp-preview-body-input',
    id: 'prp-preview-body',
    placeholder: 'Generated description will appear here…',
    readonly: '',
  }) as HTMLTextAreaElement;
  bodyGroup.appendChild(bodyTextarea);
  body.appendChild(bodyGroup);

  const costRow = el('div', { class: 'prp-cost prp-hidden' });
  body.appendChild(costRow);

  const extraGroup = el('div', { class: 'prp-form-group' });
  extraGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-extra-context' }, [
    'Extra context ',
    el('span', { class: 'prp-label-badge' }, ['Optional']),
  ]));
  const extraTextarea = el('textarea', {
    class: 'prp-extra-input',
    id: 'prp-extra-context',
    placeholder: 'Steer the next generation (e.g. "focus on migration safety")…',
  }) as HTMLTextAreaElement;
  extraTextarea.value = initialExtra;
  extraGroup.appendChild(extraTextarea);
  extraGroup.appendChild(el('div', { class: 'prp-hint' }, ['Saved per-tab until you close the browser.']));
  body.appendChild(extraGroup);

  const footer = el('div', { class: 'prp-preview-footer' });
  const variationsGroup = el('div', { class: 'prp-variations' });
  const prevBtn = el('button', { type: 'button', class: 'prp-nav-btn', title: 'Previous variation', 'aria-label': 'Previous variation' }, ['\u2190']) as HTMLButtonElement;
  const variationLabel = el('span', { class: 'prp-variation-label' }, ['—']);
  const nextBtn = el('button', { type: 'button', class: 'prp-nav-btn', title: 'Next variation', 'aria-label': 'Next variation' }, ['\u2192']) as HTMLButtonElement;
  variationsGroup.appendChild(prevBtn);
  variationsGroup.appendChild(variationLabel);
  variationsGroup.appendChild(nextBtn);
  variationsGroup.hidden = true;
  footer.appendChild(variationsGroup);

  const discardBtn = el('button', { type: 'button', class: 'prp-action-btn danger' }, ['Discard']) as HTMLButtonElement;
  const editBtn = el('button', { type: 'button', class: 'prp-action-btn' }, ['Edit']) as HTMLButtonElement;
  const regenBtn = el('button', { type: 'button', class: 'prp-action-btn' }, ['Regenerate']) as HTMLButtonElement;
  const applyBtn = el('button', { type: 'button', class: 'prp-action-btn primary' }, ['Apply']) as HTMLButtonElement;
  footer.appendChild(discardBtn);
  footer.appendChild(editBtn);
  footer.appendChild(regenBtn);
  footer.appendChild(applyBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let editable = false;
  function setEditable(v: boolean) {
    editable = v;
    if (v) {
      titleInput.removeAttribute('readonly');
      bodyTextarea.removeAttribute('readonly');
      editBtn.textContent = 'Editing';
      editBtn.disabled = true;
      titleInput.focus();
    } else {
      titleInput.setAttribute('readonly', '');
      bodyTextarea.setAttribute('readonly', '');
      editBtn.textContent = 'Edit';
      editBtn.disabled = !generatedData;
    }
  }

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function setBusy(busy: boolean) {
    applyBtn.disabled = busy || !generatedData;
    regenBtn.disabled = busy;
    editBtn.disabled = busy || !generatedData;
    extraTextarea.disabled = busy;
    if (busy) {
      status.classList.remove('prp-hidden', 'error');
      status.classList.add('info');
      status.textContent = '';
      status.appendChild(createSpinnerIcon());
      status.appendChild(document.createTextNode(' Generating…'));
    } else {
      status.classList.add('prp-hidden');
    }
  }

  function setError(msg: string | null) {
    if (!msg) {
      if (!status.classList.contains('info')) status.classList.add('prp-hidden');
      return;
    }
    status.classList.remove('prp-hidden', 'info');
    status.classList.add('error');
    status.textContent = '';
    status.appendChild(icon('error'));
    status.appendChild(document.createTextNode(' ' + msg));
  }

  function renderCurrentVariation() {
    if (variationIndex < 0 || variationIndex >= variations.length) return;
    const v = variations[variationIndex];
    titleInput.value = v.title;
    bodyTextarea.value = v.description;
    updateVariationUI();
  }

  function updateVariationUI() {
    if (variations.length <= 1) {
      variationsGroup.hidden = true;
      return;
    }
    variationsGroup.hidden = false;
    variationLabel.textContent = `${variationIndex + 1} / ${variations.length}`;
    prevBtn.disabled = variationIndex <= 0;
    nextBtn.disabled = variationIndex >= variations.length - 1;
  }

  function captureCurrentEdits() {
    if (variationIndex < 0 || variationIndex >= variations.length) return;
    variations[variationIndex] = {
      title: titleInput.value,
      description: bodyTextarea.value,
    };
  }

  function setResult(data: { title: string; description: string; costEstimate?: string }) {
    if (variations.length >= MAX_VARIATIONS) variations.shift();
    variations.push({ title: data.title, description: data.description });
    variationIndex = variations.length - 1;
    generatedData = { title: data.title, description: data.description };
    renderCurrentVariation();
    applyBtn.disabled = false;
    editBtn.disabled = editable;
    if (data.costEstimate) {
      costRow.textContent = data.costEstimate;
      costRow.classList.remove('prp-hidden');
    } else {
      costRow.classList.add('prp-hidden');
    }
  }

  const handles: PreviewHandles = {
    titleInput, bodyTextarea, extraTextarea, status,
    applyBtn, regenBtn, editBtn, discardBtn, overlay,
    setEditable, close, setResult, setBusy, setError,
  };

  function onKey(e: KeyboardEvent) {
    if (!document.body.contains(overlay)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (!applyBtn.disabled) {
        e.preventDefault();
        applyBtn.click();
      }
    }
  }
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);
  discardBtn.addEventListener('click', close);
  editBtn.addEventListener('click', () => setEditable(true));
  regenBtn.addEventListener('click', () => {
    captureCurrentEdits();
    runGeneration(handles, { useCachedDiff: true });
  });
  prevBtn.addEventListener('click', () => {
    if (variationIndex <= 0) return;
    captureCurrentEdits();
    variationIndex -= 1;
    renderCurrentVariation();
  });
  nextBtn.addEventListener('click', () => {
    if (variationIndex >= variations.length - 1) return;
    captureCurrentEdits();
    variationIndex += 1;
    renderCurrentVariation();
  });
  applyBtn.addEventListener('click', () => {
    const data = {
      title: titleInput.value,
      description: bodyTextarea.value,
    };
    applyResult(data);
    close();
  });

  extraTextarea.addEventListener('input', () => {
    saveExtraContext(currentPrUrl(), extraTextarea.value);
  });

  setEditable(false);
  applyBtn.disabled = true;

  return handles;
}

async function openSettingsModal() {
  if (document.getElementById('prp-settings-modal')) return;

  if (!chrome?.storage?.local) {
    alert('Extension context invalidated. Please refresh the page.');
    return;
  }

  const settings = await loadSettings();
  let currentProviderId: ProviderId = settings.provider;

  const modalOverlay = el('div', { id: 'prp-settings-modal', class: 'prp-modal-overlay' });
  const modal = el('div', { class: 'prp-modal' });

  const header = el('div', { class: 'prp-modal-header' });
  const titleDiv = el('div', { class: 'prp-modal-title' }, [icon('sparkle'), ' PR-Please Settings']);
  const closeBtn = el('button', { class: 'prp-close-btn', id: 'prp-modal-close' }, [icon('close')]);
  header.appendChild(titleDiv);
  header.appendChild(closeBtn);

  const body = el('div', { class: 'prp-modal-body' });

  const intro = el('div', { class: 'prp-intro' });
  const introTitle = el('div', { class: 'prp-intro-title' }, ['AI Provider']);
  intro.appendChild(introTitle);
  intro.appendChild(el('div', { class: 'prp-intro-desc' }, ['Generate PR content directly from your browser.']));
  body.appendChild(intro);

  // Provider selector
  const providerGroup = el('div', { class: 'prp-form-group' });
  providerGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-provider' }, ['Provider']));
  const providerSelect = el('select', { class: 'prp-select', id: 'prp-provider' });
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    providerSelect.appendChild(el('option', { value: id }, [PROVIDERS[id].label]));
  }
  providerGroup.appendChild(providerSelect);
  providerGroup.appendChild(el('div', { class: 'prp-hint' }, ['Each provider keeps its own API key and model.']));
  body.appendChild(providerGroup);

  // API Endpoint
  const endpointGroup = el('div', { class: 'prp-form-group' });
  endpointGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-api-provider' }, ['API Endpoint']));
  const endpointSelect = el('select', { class: 'prp-select', id: 'prp-api-provider' });
  endpointSelect.appendChild(el('option', { value: 'default' }, ['Official']));
  endpointSelect.appendChild(el('option', { value: 'custom' }, ['Custom URL']));
  endpointGroup.appendChild(endpointSelect);
  endpointGroup.appendChild(el('div', { class: 'prp-hint' }, ['Where requests are sent. Choose Custom for a proxy.']));
  body.appendChild(endpointGroup);

  // Custom URL (conditional)
  const customUrlGroup = el('div', { class: 'prp-form-group', id: 'prp-custom-url-group' });
  customUrlGroup.hidden = true;
  customUrlGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-base-url' }, ['Custom URL']));
  const baseUrlInput = el('input', { class: 'prp-input', id: 'prp-base-url', type: 'url', placeholder: 'https://your-proxy.example.com', autocomplete: 'off', spellcheck: 'false' });
  customUrlGroup.appendChild(baseUrlInput);
  customUrlGroup.appendChild(el('div', { class: 'prp-hint' }, ['Must include the scheme (https:// or http://).']));
  body.appendChild(customUrlGroup);

  // Model
  const modelGroup = el('div', { class: 'prp-form-group' });
  modelGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-model-select' }, ['Model']));
  const modelSelect = el('select', { class: 'prp-select', id: 'prp-model-select' });
  modelGroup.appendChild(modelSelect);
  body.appendChild(modelGroup);

  // API Key
  const apiKeyGroup = el('div', { class: 'prp-form-group', id: 'prp-api-key-group' });
  apiKeyGroup.appendChild(el('label', { class: 'prp-label', for: 'prp-api-key' }, ['API Key']));
  const apiKeyInput = el('input', { class: 'prp-input', type: 'password', id: 'prp-api-key', placeholder: 'Enter your API key', autocomplete: 'off', spellcheck: 'false' });
  apiKeyGroup.appendChild(apiKeyInput);
  apiKeyGroup.appendChild(el('div', { class: 'prp-hint' }, ['Stored locally in your browser, never synced']));
  body.appendChild(apiKeyGroup);

  function applyEndpointChoice(providerId: ProviderId, choice: EndpointChoice, storedBaseUrl?: string) {
    const provider = PROVIDERS[providerId];
    endpointSelect.value = choice;
    customUrlGroup.hidden = choice !== 'custom';
    if (choice === 'custom' && storedBaseUrl && storedBaseUrl !== provider.defaultBaseUrl) {
      baseUrlInput.value = storedBaseUrl;
    }
  }

  function resolveEndpointChoice(baseUrl: string, defaultBaseUrl: string): EndpointChoice {
    const trimmed = (baseUrl || '').trim().replace(/\/$/, '');
    if (!trimmed || trimmed === defaultBaseUrl) return 'default';
    return 'custom';
  }

  function renderForProvider(providerId: ProviderId) {
    const provider = PROVIDERS[providerId];
    const config = settings.providers[providerId];
    currentProviderId = providerId;
    providerSelect.value = providerId;
    introTitle.textContent = provider.label;

    // Populate model options
    modelSelect.textContent = '';
    for (const m of provider.modelOptions) {
      modelSelect.appendChild(el('option', { value: m }, [m]));
    }
    modelSelect.value = provider.modelOptions.includes(config.model) ? config.model : provider.defaultModel;

    baseUrlInput.value = '';
    const baseUrl = config.baseUrl || provider.defaultBaseUrl;
    applyEndpointChoice(providerId, resolveEndpointChoice(baseUrl, provider.defaultBaseUrl), baseUrl);

    apiKeyGroup.hidden = !provider.requiresApiKey;
    apiKeyInput.placeholder = provider.requiresApiKey ? `Enter your ${provider.label} API key` : '';
    apiKeyInput.value = config.apiKeyEncoded ? deobfuscateApiKey(config.apiKeyEncoded) : '';
  }

  providerSelect.addEventListener('change', () => {
    if (!isProviderId(providerSelect.value)) return;
    renderForProvider(providerSelect.value);
  });

  endpointSelect.addEventListener('change', () => {
    applyEndpointChoice(currentProviderId, endpointSelect.value as EndpointChoice);
    if (endpointSelect.value === 'custom') baseUrlInput.focus();
  });

  // Redact patterns
  const redactGroup = el('div', { class: 'prp-form-group' });
  redactGroup.appendChild(el('label', { class: 'prp-label' }, ['Diff Redaction']));
  const tagWrapper = el('div', { class: 'prp-tag-wrapper' }) as HTMLDivElement;
  const tagAddRow = el('div', { class: 'prp-tag-add-row' });
  const tagInput = el('input', { class: 'prp-tag-input', type: 'text', placeholder: 'e.g. secrets/**, *.pem', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const tagAddBtn = el('button', { type: 'button', class: 'prp-tag-btn' }, ['Add']) as HTMLButtonElement;
  const tagRecommBtn = el('button', { type: 'button', class: 'prp-tag-btn' }, ['Recommended']) as HTMLButtonElement;
  tagAddRow.appendChild(tagInput);
  tagAddRow.appendChild(tagAddBtn);
  tagAddRow.appendChild(tagRecommBtn);
  redactGroup.appendChild(tagWrapper);
  redactGroup.appendChild(tagAddRow);
  redactGroup.appendChild(el('div', { class: 'prp-hint' }, ['Files matching these patterns are redacted before the diff is sent.']));
  body.appendChild(redactGroup);

  const RECOMMENDED = ['.env*', 'secrets/**', '*.pem', '*.key', '*.cert'];
  let localPatterns: string[] = [...settings.redactPatterns];

  function renderLocalTags() {
    tagWrapper.textContent = '';
    for (const p of localPatterns) {
      const chip = el('span', { class: 'prp-tag' }, [p]);
      const removeBtn = el('button', { type: 'button', class: 'prp-tag-remove' }, ['×']) as HTMLButtonElement;
      removeBtn.addEventListener('click', () => {
        localPatterns = localPatterns.filter(x => x !== p);
        renderLocalTags();
      });
      chip.appendChild(removeBtn);
      tagWrapper.appendChild(chip);
    }
  }

  function addLocalPattern(p: string) {
    const trimmed = p.trim();
    if (!trimmed || localPatterns.includes(trimmed)) return;
    localPatterns.push(trimmed);
    renderLocalTags();
  }

  tagAddBtn.addEventListener('click', () => { addLocalPattern(tagInput.value); tagInput.value = ''; tagInput.focus(); });
  tagInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addLocalPattern(tagInput.value); tagInput.value = ''; } });
  tagRecommBtn.addEventListener('click', () => { RECOMMENDED.forEach(addLocalPattern); });
  renderLocalTags();

  const saveBtn = el('button', { class: 'prp-save-btn', id: 'prp-save-btn' }, ['Save Settings']);
  body.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  renderForProvider(currentProviderId);

  closeBtn.addEventListener('click', closeSettingsModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeSettingsModal();
  });

  saveBtn.addEventListener('click', async () => {
    const provider = PROVIDERS[currentProviderId];
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const choice = endpointSelect.value as EndpointChoice;

    let baseUrl: string;
    if (choice === 'default') {
      baseUrl = provider.defaultBaseUrl;
    } else {
      const raw = baseUrlInput.value.trim();
      try {
        const u = new URL(raw);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
        baseUrl = raw.replace(/\/$/, '');
      } catch {
        alert('Invalid Custom URL. It must start with http:// or https://');
        return;
      }
    }

    if (provider.requiresApiKey && !apiKey) {
      alert(`Please enter a ${provider.label} API key.`);
      return;
    }

    const updated: StoredSettings = {
      provider: currentProviderId,
      providers: {
        ...settings.providers,
        [currentProviderId]: {
          apiKeyEncoded: apiKey ? obfuscateApiKey(apiKey) : '',
          baseUrl,
          model,
        },
      },
      redactPatterns: localPatterns,
    };

    try {
      await saveSettings(updated);
      settings.provider = updated.provider;
      settings.providers = updated.providers;
      settings.redactPatterns = updated.redactPatterns;
      saveBtn.textContent = 'Saved!';
      setTimeout(closeSettingsModal, 1000);
    } catch {
      alert('Error saving settings.');
    }
  });
}

function closeSettingsModal() {
  document.getElementById('prp-settings-modal')?.remove();
}

let observerTimer: ReturnType<typeof setTimeout> | null = null;
const observer = new MutationObserver(() => {
  if (observerTimer) clearTimeout(observerTimer);
  observerTimer = setTimeout(() => injectButton(), 200);
});
observer.observe(document.body, { childList: true, subtree: true });

injectButton();
