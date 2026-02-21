// content.ts
import { DEFAULT_SERVICE_URL, obfuscateApiKey, deobfuscateApiKey } from './utils';

// ── Icon Helpers ──
// Create SVG elements via DOM API instead of innerHTML to prevent injection risks.
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
  service: 'M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zM6.379 5.227A.25.25 0 006 5.442v5.117a.25.25 0 00.379.214l4.264-2.559a.25.25 0 000-.428L6.379 5.227z',
  local: 'M8.75 1.75a.75.75 0 00-1.5 0v5.69L5.03 5.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 7.44V1.75z',
};

const ICON_TRANSFORMS: Record<string, string> = {
  gear: 'scale(0.72) translate(3,3)',
  service: 'scale(0.85) translate(1.2,1.2)',
  local: 'scale(0.85) translate(1.2,1.2)',
};

function icon(name: keyof typeof ICON_PATHS): SVGSVGElement {
  if (name === 'sparkle' || name === 'success' || name === 'error' || name === 'close') {
    return createSvgIcon(ICON_PATHS[name]);
  }
  return createSvgIcon(ICON_PATHS[name], ICON_TRANSFORMS[name]);
}

// ── Styles (M4: removed external Google Fonts import, using system fonts only) ──
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

  /* Result Bar */
  .prp-result-bar {
    padding: 8px 12px;
    background: rgba(35,134,54,0.15);
    border: 1px solid rgba(35,134,54,0.3);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e6edf3;
    animation: prp-slide-down 0.2s ease-out;
  }

  .prp-result-bar svg { width: 16px; height: 16px; fill: #3fb950; flex-shrink: 0; }

  .prp-actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }

  .prp-action-btn {
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    border: none;
    cursor: pointer;
  }

  .prp-primary { background: #238636; color: #fff; }
  .prp-primary:hover { background: #2ea043; }

  .prp-secondary { background: #21262d; color: #e6edf3; border: 1px solid #30363d; }
  .prp-secondary:hover { background: #30363d; }

  .prp-danger { background: transparent; color: #f85149; }
  .prp-danger:hover { background: rgba(248,81,73,0.1); }

  @keyframes prp-slide-down {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

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
    width: 360px;
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

  .prp-toggle {
    display: flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 3px;
    margin-bottom: 20px;
  }

  .prp-toggle-opt {
    flex: 1;
    background: transparent;
    border: none;
    color: #8b949e;
    padding: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .prp-toggle-opt svg { width: 14px; height: 14px; fill: currentColor; }

  .prp-toggle-opt.active {
    background: #238636;
    color: #fff;
  }

  .prp-form-group { margin-bottom: 16px; }
  .prp-label { display: block; font-size: 13px; font-weight: 500; color: #8b949e; margin-bottom: 6px; }

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
`;

// ── Inject Styles ──
const styleEl = document.createElement('style');
styleEl.textContent = INJECTED_STYLES;
document.head.appendChild(styleEl);

// ── State ──
let generatedData: { title: string; description: string } | null = null;

// ── DOM Helper ──
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

// ── Inject Logic (M3: uses DOM API instead of innerHTML) ──
function injectButton() {
  const titleInput = document.querySelector('input[name="pull_request[title]"]');
  if (!titleInput || document.getElementById('pr-please-wrapper')) return;

  const wrapper = el('div', { id: 'pr-please-wrapper', class: 'pr-please-wrapper' });

  const row = el('div', { class: 'prp-row' });

  const generateBtn = el('button', { type: 'button', class: 'prp-btn', id: 'prp-generate-btn' }, [
    icon('sparkle'), ' Generate with AI'
  ]);

  const settingsBtn = el('button', { type: 'button', class: 'prp-settings-btn', id: 'prp-settings-btn', title: 'Settings' }, [
    icon('gear')
  ]);

  row.appendChild(generateBtn);
  row.appendChild(settingsBtn);

  const resultBar = el('div', { id: 'prp-result-bar', class: 'prp-result-bar', style: 'display: none;' });

  wrapper.appendChild(row);
  wrapper.appendChild(resultBar);

  // GitHub wraps the input in a <text-expander> element now.
  // We want to inject AFTER the input (or its wrapper) so it appears below it.
  const textExpander = titleInput.closest('text-expander');
  const targetElement = textExpander || titleInput;
  targetElement.insertAdjacentElement('afterend', wrapper);

  generateBtn.addEventListener('click', handleGenerate);
  settingsBtn.addEventListener('click', openSettingsModal);
}

async function handleGenerate(e: Event) {
  const btn = e.currentTarget as HTMLButtonElement;

  // Capture original child nodes for restore
  const originalChildren: Node[] = [];
  btn.childNodes.forEach(n => originalChildren.push(n.cloneNode(true)));

  function restoreBtn() {
    btn.textContent = '';
    originalChildren.forEach(n => btn.appendChild(n.cloneNode(true)));
    btn.disabled = false;
    btn.classList.remove('loading', 'success', 'error');
  }

  function setBtnState(iconName: 'sparkle' | 'success' | 'error' | 'close', text: string, svgFactory?: () => SVGSVGElement) {
    btn.textContent = '';
    btn.appendChild(svgFactory ? svgFactory() : icon(iconName));
    btn.appendChild(document.createTextNode(` ${text}`));
  }

  // Loading State
  btn.disabled = true;
  btn.classList.add('loading');
  setBtnState('sparkle', 'Generating...', createSpinnerIcon);
  hideResultBar();

  try {
    if (!chrome?.runtime?.sendMessage) {
      throw new Error('Extension context invalidated. Please refresh the page.');
    }

    const commitElements = document.querySelectorAll('.js-commits-list-item p.mb-1 a.markdown-title, .commit-message code a');
    const commits = Array.from(commitElements).map(el => el.textContent?.trim()).filter(Boolean) as string[];
    const prUrl = window.location.href.split('?')[0];

    const response = await chrome.runtime.sendMessage({
      action: 'GENERATE_PR',
      commits,
      prUrl
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Success — auto-apply immediately
    generatedData = response;
    applyResult();
    btn.classList.add('success');
    setBtnState('success', 'Applied!');

    setTimeout(restoreBtn, 3000);
  } catch (err: any) {
    // L1: Log full error for debugging, show generic message to user
    console.error('PR-Please generation error:', err);
    btn.classList.add('error');
    setBtnState('error', 'Failed');

    // Show a safe, generic message — do not expose raw error details
    const safeMessage = (err.message && !err.message.includes('<'))
      ? err.message
      : 'An unexpected error occurred. Check the console for details.';
    alert(`Generation failed: ${safeMessage}`);

    setTimeout(restoreBtn, 3000);
  }
}

function hideResultBar() {
  const bar = document.getElementById('prp-result-bar');
  if (bar) bar.style.display = 'none';
}

function applyResult() {
  if (!generatedData) return;

  const titleInput = document.querySelector('input[name="pull_request[title]"]') as HTMLInputElement;
  const bodyInput = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;

  if (titleInput && generatedData.title) {
    titleInput.value = generatedData.title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (bodyInput && generatedData.description) {
    bodyInput.value = generatedData.description;
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  hideResultBar();
}

// ── Settings Modal Logic (M3: built with DOM API) ──
function openSettingsModal() {
  if (document.getElementById('prp-settings-modal')) return;

  if (!chrome?.storage?.local) {
    alert('Extension context invalidated. Please refresh the page.');
    return;
  }

  const modalOverlay = el('div', { id: 'prp-settings-modal', class: 'prp-modal-overlay' });

  const modal = el('div', { class: 'prp-modal' });

  // Header
  const header = el('div', { class: 'prp-modal-header' });
  const titleDiv = el('div', { class: 'prp-modal-title' }, [icon('sparkle'), ' PR-Please Settings']);
  const closeBtn = el('button', { class: 'prp-close-btn', id: 'prp-modal-close' }, [icon('close')]);
  header.appendChild(titleDiv);
  header.appendChild(closeBtn);

  // Body
  const body = el('div', { class: 'prp-modal-body' });

  const modeLabel = el('div', { class: 'prp-label' }, ['Generation Mode']);
  body.appendChild(modeLabel);

  const toggle = el('div', { class: 'prp-toggle' });
  const modeRemoteBtn = el('button', { class: 'prp-toggle-opt active', id: 'prp-mode-remote', 'data-mode': 'remote' }, [icon('service'), ' Service']);
  const modeLocalBtn = el('button', { class: 'prp-toggle-opt', id: 'prp-mode-local', 'data-mode': 'local' }, [icon('local'), ' Local']);
  toggle.appendChild(modeRemoteBtn);
  toggle.appendChild(modeLocalBtn);
  body.appendChild(toggle);

  // Remote fields
  const remoteFields = el('div', { id: 'prp-remote-fields' });
  const remoteGroup = el('div', { class: 'prp-form-group' });
  remoteGroup.appendChild(el('label', { class: 'prp-label' }, ['Service URL']));
  const serviceUrlInput = el('input', { class: 'prp-input', id: 'prp-service-url', value: DEFAULT_SERVICE_URL });
  remoteGroup.appendChild(serviceUrlInput);
  remoteFields.appendChild(remoteGroup);
  body.appendChild(remoteFields);

  // Local fields
  const localFields = el('div', { id: 'prp-local-fields', style: 'display:none' });

  const modelGroup = el('div', { class: 'prp-form-group' });
  modelGroup.appendChild(el('label', { class: 'prp-label' }, ['Model']));
  const modelSelect = el('select', { class: 'prp-select', id: 'prp-model-select' });
  for (const m of ['gemini-2.5-flash', 'gemini-1.5-pro']) {
    const opt = el('option', { value: m }, [m]);
    modelSelect.appendChild(opt);
  }
  modelGroup.appendChild(modelSelect);
  localFields.appendChild(modelGroup);

  const apiKeyGroup = el('div', { class: 'prp-form-group' });
  apiKeyGroup.appendChild(el('label', { class: 'prp-label' }, ['API Key']));
  const apiKeyInput = el('input', { class: 'prp-input', type: 'password', id: 'prp-api-key', placeholder: 'Gemini API Key' });
  apiKeyGroup.appendChild(apiKeyInput);
  localFields.appendChild(apiKeyGroup);

  body.appendChild(localFields);

  const saveBtn = el('button', { class: 'prp-save-btn', id: 'prp-save-btn' }, ['Save Settings']);
  body.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Load Settings — all from local storage, API key is obfuscated
  chrome.storage.local.get(['mode', 'serviceUrl', 'model', 'apiKeyEncoded'], (res) => {
    const mode = res.mode || 'remote';
    updateModeUI(mode);

    serviceUrlInput.value = res.serviceUrl || DEFAULT_SERVICE_URL;
    modelSelect.value = res.model || 'gemini-2.5-flash';
    apiKeyInput.value = res.apiKeyEncoded ? deobfuscateApiKey(res.apiKeyEncoded) : '';
  });

  // Events
  closeBtn.addEventListener('click', closeSettingsModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeSettingsModal();
  });

  modeRemoteBtn.addEventListener('click', () => updateModeUI('remote'));
  modeLocalBtn.addEventListener('click', () => updateModeUI('local'));

  saveBtn.addEventListener('click', saveSettings);
}

function updateModeUI(mode: string) {
  const remoteBtn = document.getElementById('prp-mode-remote');
  const localBtn = document.getElementById('prp-mode-local');
  const remoteFields = document.getElementById('prp-remote-fields');
  const localFields = document.getElementById('prp-local-fields');

  if (mode === 'remote') {
    remoteBtn?.classList.add('active');
    localBtn?.classList.remove('active');
    if (remoteFields) remoteFields.style.display = 'block';
    if (localFields) localFields.style.display = 'none';
  } else {
    remoteBtn?.classList.remove('active');
    localBtn?.classList.add('active');
    if (remoteFields) remoteFields.style.display = 'none';
    if (localFields) localFields.style.display = 'block';
  }

  const toggle = document.querySelector('.prp-toggle');
  if (toggle) toggle.setAttribute('data-current-mode', mode);
}

function closeSettingsModal() {
  document.getElementById('prp-settings-modal')?.remove();
}

function saveSettings() {
  if (!chrome?.storage?.local) {
    alert('Extension context invalidated. Please refresh the page.');
    return;
  }

  const toggle = document.querySelector('.prp-toggle');
  const mode = toggle?.getAttribute('data-current-mode') || 'remote';

  const serviceUrl = (document.getElementById('prp-service-url') as HTMLInputElement).value;
  const model = (document.getElementById('prp-model-select') as HTMLSelectElement).value;
  const apiKey = (document.getElementById('prp-api-key') as HTMLInputElement).value;

  // Store API key encoded in local storage (persistent, obfuscated)
  const apiKeyEncoded = apiKey ? obfuscateApiKey(apiKey) : '';
  chrome.storage.local.set({ mode, serviceUrl, model, apiKeyEncoded }, () => {
    const btn = document.getElementById('prp-save-btn');
    if (btn) {
      btn.textContent = 'Saved!';
      setTimeout(() => {
        closeSettingsModal();
      }, 1000);
    }
  });
}

// L3: Debounced MutationObserver
let observerTimer: ReturnType<typeof setTimeout> | null = null;
const observer = new MutationObserver(() => {
  if (observerTimer) clearTimeout(observerTimer);
  observerTimer = setTimeout(() => injectButton(), 200);
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial
injectButton();
