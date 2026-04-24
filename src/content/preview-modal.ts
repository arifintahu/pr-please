import { el } from './dom';
import { icon, createSpinnerIcon } from './icons';
import { extractPartialJson } from './json-parse';
import { applyResult, currentPrUrl, saveExtraContext } from './page-state';

const MAX_VARIATIONS = 3;

interface Variation {
  title: string;
  description: string;
}

export interface PreviewResult {
  title: string;
  description: string;
  costEstimate?: string;
}

export interface PreviewHandles {
  extraTextarea: HTMLTextAreaElement;
  overlay: HTMLDivElement;
  setEditable: (editable: boolean) => void;
  close: () => void;
  setResult: (data: PreviewResult) => void;
  setBusy: (busy: boolean, streaming?: boolean) => void;
  setError: (msg: string | null) => void;
  setStreamingText: (raw: string) => void;
}

export type RegenerateFn = (handles: PreviewHandles) => void;

interface PreviewElements {
  overlay: HTMLDivElement;
  titleInput: HTMLInputElement;
  bodyTextarea: HTMLTextAreaElement;
  extraTextarea: HTMLTextAreaElement;
  status: HTMLDivElement;
  costRow: HTMLDivElement;
  applyBtn: HTMLButtonElement;
  regenBtn: HTMLButtonElement;
  editBtn: HTMLButtonElement;
  discardBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  variationsGroup: HTMLDivElement;
  variationLabel: HTMLSpanElement;
}

function buildHeader(): { header: HTMLDivElement; closeBtn: HTMLButtonElement } {
  const header = el('div', { class: 'prp-modal-header' });
  const titleDiv = el('div', { class: 'prp-modal-title' }, [icon('sparkle'), ' PR-Please Preview']);
  const closeBtn = el('button', { class: 'prp-close-btn', type: 'button' }, [icon('close')]);
  header.appendChild(titleDiv);
  header.appendChild(closeBtn);
  return { header, closeBtn };
}

function buildStatus(): HTMLDivElement {
  const status = el('div', { class: 'prp-status info' });
  status.appendChild(createSpinnerIcon());
  status.appendChild(document.createTextNode(' Generating…'));
  return status;
}

function buildTitleGroup(): { group: HTMLDivElement; input: HTMLInputElement } {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(el('label', { class: 'prp-label', for: 'prp-preview-title' }, ['Title']));
  const input = el('input', {
    class: 'prp-preview-title-input',
    id: 'prp-preview-title',
    type: 'text',
    placeholder: 'Generated title will appear here…',
    readonly: '',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  group.appendChild(input);
  return { group, input };
}

function buildBodyGroup(): { group: HTMLDivElement; textarea: HTMLTextAreaElement } {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(
    el('label', { class: 'prp-label', for: 'prp-preview-body' }, ['Description'])
  );
  const textarea = el('textarea', {
    class: 'prp-preview-body-input',
    id: 'prp-preview-body',
    placeholder: 'Generated description will appear here…',
    readonly: '',
  });
  group.appendChild(textarea);
  return { group, textarea };
}

function buildExtraGroup(initialExtra: string): {
  group: HTMLDivElement;
  textarea: HTMLTextAreaElement;
} {
  const group = el('div', { class: 'prp-form-group' });
  group.appendChild(
    el('label', { class: 'prp-label', for: 'prp-extra-context' }, [
      'Extra context ',
      el('span', { class: 'prp-label-badge' }, ['Optional']),
    ])
  );
  const textarea = el('textarea', {
    class: 'prp-extra-input',
    id: 'prp-extra-context',
    placeholder: 'Steer the next generation (e.g. "focus on migration safety")…',
  });
  textarea.value = initialExtra;
  group.appendChild(textarea);
  group.appendChild(
    el('div', { class: 'prp-hint' }, ['Saved per-tab until you close the browser.'])
  );
  return { group, textarea };
}

function buildNavGroup(): {
  group: HTMLDivElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  label: HTMLSpanElement;
} {
  const group = el('div', { class: 'prp-variations' });
  const prevBtn = el(
    'button',
    {
      type: 'button',
      class: 'prp-nav-btn',
      title: 'Previous variation',
      'aria-label': 'Previous variation',
    },
    ['\u2190']
  );
  const label = el('span', { class: 'prp-variation-label' }, ['—']);
  const nextBtn = el(
    'button',
    {
      type: 'button',
      class: 'prp-nav-btn',
      title: 'Next variation',
      'aria-label': 'Next variation',
    },
    ['\u2192']
  );
  group.appendChild(prevBtn);
  group.appendChild(label);
  group.appendChild(nextBtn);
  group.hidden = true;
  return { group, prevBtn, nextBtn, label };
}

function buildFooter(): {
  footer: HTMLDivElement;
  variationsGroup: HTMLDivElement;
  variationLabel: HTMLSpanElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  discardBtn: HTMLButtonElement;
  editBtn: HTMLButtonElement;
  regenBtn: HTMLButtonElement;
  applyBtn: HTMLButtonElement;
} {
  const footer = el('div', { class: 'prp-preview-footer' });
  const nav = buildNavGroup();
  footer.appendChild(nav.group);

  const discardBtn = el('button', { type: 'button', class: 'prp-action-btn danger' }, ['Discard']);
  const editBtn = el('button', { type: 'button', class: 'prp-action-btn' }, ['Edit']);
  const regenBtn = el('button', { type: 'button', class: 'prp-action-btn' }, ['Regenerate']);
  const applyBtn = el('button', { type: 'button', class: 'prp-action-btn primary' }, ['Apply']);
  footer.appendChild(discardBtn);
  footer.appendChild(editBtn);
  footer.appendChild(regenBtn);
  footer.appendChild(applyBtn);

  return {
    footer,
    variationsGroup: nav.group,
    variationLabel: nav.label,
    prevBtn: nav.prevBtn,
    nextBtn: nav.nextBtn,
    discardBtn,
    editBtn,
    regenBtn,
    applyBtn,
  };
}

function buildPreviewDom(initialExtra: string): PreviewElements {
  const overlay = el('div', { id: 'prp-preview-modal', class: 'prp-modal-overlay' });
  const modal = el('div', { class: 'prp-modal prp-preview-modal' });

  const { header, closeBtn } = buildHeader();
  const body = el('div', { class: 'prp-preview-body' });
  const status = buildStatus();
  const { group: titleGroup, input: titleInput } = buildTitleGroup();
  const { group: bodyGroup, textarea: bodyTextarea } = buildBodyGroup();
  const costRow = el('div', { class: 'prp-cost prp-hidden' });
  const { group: extraGroup, textarea: extraTextarea } = buildExtraGroup(initialExtra);

  body.appendChild(status);
  body.appendChild(titleGroup);
  body.appendChild(bodyGroup);
  body.appendChild(costRow);
  body.appendChild(extraGroup);

  const footer = buildFooter();

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer.footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return {
    overlay,
    titleInput,
    bodyTextarea,
    extraTextarea,
    status,
    costRow,
    closeBtn,
    applyBtn: footer.applyBtn,
    regenBtn: footer.regenBtn,
    editBtn: footer.editBtn,
    discardBtn: footer.discardBtn,
    prevBtn: footer.prevBtn,
    nextBtn: footer.nextBtn,
    variationsGroup: footer.variationsGroup,
    variationLabel: footer.variationLabel,
  };
}

interface PreviewState {
  variations: Variation[];
  index: number;
  editable: boolean;
  hasResult: boolean;
}

function makeStatusController(status: HTMLDivElement) {
  return {
    showBusy(streaming: boolean) {
      status.classList.remove('prp-hidden', 'error');
      status.classList.add('info');
      status.textContent = '';
      status.appendChild(createSpinnerIcon());
      status.appendChild(document.createTextNode(streaming ? ' Streaming…' : ' Generating…'));
    },
    hideBusy() {
      if (!status.classList.contains('error')) status.classList.add('prp-hidden');
    },
    showError(msg: string) {
      status.classList.remove('prp-hidden', 'info');
      status.classList.add('error');
      status.textContent = '';
      status.appendChild(icon('error'));
      status.appendChild(document.createTextNode(' ' + msg));
    },
    hideError() {
      if (!status.classList.contains('info')) status.classList.add('prp-hidden');
    },
  };
}

function setEditableImpl(elements: PreviewElements, state: PreviewState, v: boolean) {
  state.editable = v;
  if (v) {
    elements.titleInput.removeAttribute('readonly');
    elements.bodyTextarea.removeAttribute('readonly');
    elements.editBtn.textContent = 'Editing';
    elements.editBtn.disabled = true;
    elements.titleInput.focus();
  } else {
    elements.titleInput.setAttribute('readonly', '');
    elements.bodyTextarea.setAttribute('readonly', '');
    elements.editBtn.textContent = 'Edit';
    elements.editBtn.disabled = !state.hasResult;
  }
}

function updateVariationUI(elements: PreviewElements, state: PreviewState) {
  if (state.variations.length <= 1) {
    elements.variationsGroup.hidden = true;
    return;
  }
  elements.variationsGroup.hidden = false;
  elements.variationLabel.textContent = `${state.index + 1} / ${state.variations.length}`;
  elements.prevBtn.disabled = state.index <= 0;
  elements.nextBtn.disabled = state.index >= state.variations.length - 1;
}

function renderCurrentVariation(elements: PreviewElements, state: PreviewState) {
  if (state.index < 0 || state.index >= state.variations.length) return;
  const v = state.variations[state.index];
  elements.titleInput.value = v.title;
  elements.bodyTextarea.value = v.description;
  updateVariationUI(elements, state);
}

function setResultImpl(elements: PreviewElements, state: PreviewState, data: PreviewResult) {
  if (state.variations.length >= MAX_VARIATIONS) state.variations.shift();
  state.variations.push({ title: data.title, description: data.description });
  state.index = state.variations.length - 1;
  state.hasResult = true;
  renderCurrentVariation(elements, state);
  elements.applyBtn.disabled = false;
  elements.editBtn.disabled = state.editable;
  if (data.costEstimate) {
    elements.costRow.textContent = data.costEstimate;
    elements.costRow.classList.remove('prp-hidden');
  } else {
    elements.costRow.classList.add('prp-hidden');
  }
}

function createHandles(
  elements: PreviewElements,
  state: PreviewState,
  onKeydown: (e: KeyboardEvent) => void
): PreviewHandles {
  const statusCtrl = makeStatusController(elements.status);

  function setBusy(busy: boolean, streaming = false) {
    elements.applyBtn.disabled = busy || !state.hasResult;
    elements.regenBtn.disabled = busy;
    elements.editBtn.disabled = busy || !state.hasResult;
    elements.extraTextarea.disabled = busy;
    if (busy) statusCtrl.showBusy(streaming);
    else statusCtrl.hideBusy();
  }

  function setStreamingText(raw: string) {
    const partial = extractPartialJson(raw);
    if (!partial) return;
    if (partial.title) elements.titleInput.value = partial.title;
    if (partial.description !== undefined) elements.bodyTextarea.value = partial.description;
  }

  function setError(msg: string | null) {
    if (!msg) statusCtrl.hideError();
    else statusCtrl.showError(msg);
  }

  function close() {
    elements.overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  return {
    extraTextarea: elements.extraTextarea,
    overlay: elements.overlay,
    setEditable: (v) => setEditableImpl(elements, state, v),
    close,
    setResult: (data) => setResultImpl(elements, state, data),
    setBusy,
    setError,
    setStreamingText,
  };
}

function wirePreviewEvents(
  elements: PreviewElements,
  handles: PreviewHandles,
  state: PreviewState,
  onRegenerate: RegenerateFn
) {
  function captureCurrentEdits() {
    if (state.index < 0 || state.index >= state.variations.length) return;
    state.variations[state.index] = {
      title: elements.titleInput.value,
      description: elements.bodyTextarea.value,
    };
  }

  function renderCurrent() {
    if (state.index < 0 || state.index >= state.variations.length) return;
    const v = state.variations[state.index];
    elements.titleInput.value = v.title;
    elements.bodyTextarea.value = v.description;
    const multiple = state.variations.length > 1;
    elements.variationsGroup.hidden = !multiple;
    if (multiple) {
      elements.variationLabel.textContent = `${state.index + 1} / ${state.variations.length}`;
      elements.prevBtn.disabled = state.index <= 0;
      elements.nextBtn.disabled = state.index >= state.variations.length - 1;
    }
  }

  elements.overlay.addEventListener('click', (e) => {
    if (e.target === elements.overlay) handles.close();
  });
  elements.closeBtn.addEventListener('click', handles.close);
  elements.discardBtn.addEventListener('click', handles.close);
  elements.editBtn.addEventListener('click', () => handles.setEditable(true));
  elements.regenBtn.addEventListener('click', () => {
    captureCurrentEdits();
    onRegenerate(handles);
  });
  elements.prevBtn.addEventListener('click', () => {
    if (state.index <= 0) return;
    captureCurrentEdits();
    state.index -= 1;
    renderCurrent();
  });
  elements.nextBtn.addEventListener('click', () => {
    if (state.index >= state.variations.length - 1) return;
    captureCurrentEdits();
    state.index += 1;
    renderCurrent();
  });
  elements.applyBtn.addEventListener('click', () => {
    applyResult({
      title: elements.titleInput.value,
      description: elements.bodyTextarea.value,
    });
    handles.close();
  });
  elements.extraTextarea.addEventListener('input', () => {
    saveExtraContext(currentPrUrl(), elements.extraTextarea.value);
  });
}

export function openPreviewModal(initialExtra: string, onRegenerate: RegenerateFn): PreviewHandles {
  const elements = buildPreviewDom(initialExtra);
  const state: PreviewState = { variations: [], index: -1, editable: false, hasResult: false };

  function onKey(e: KeyboardEvent) {
    if (!document.body.contains(elements.overlay)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      handles.close();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (!elements.applyBtn.disabled) {
        e.preventDefault();
        elements.applyBtn.click();
      }
    }
  }

  const handles = createHandles(elements, state, onKey);
  document.addEventListener('keydown', onKey);
  wirePreviewEvents(elements, handles, state, onRegenerate);

  handles.setEditable(false);
  elements.applyBtn.disabled = true;

  return handles;
}
