import type { PopupElements } from './elements';

const RECOMMENDED_PATTERNS = ['.env*', 'secrets/**', '*.pem', '*.key', '*.cert'];

export interface RedactController {
  get: () => string[];
  replace: (patterns: string[]) => void;
}

export function setupRedactControls(
  elements: PopupElements,
  initial: string[]
): RedactController {
  let patterns: string[] = [...initial];

  function render() {
    elements.redactTagsEl.textContent = '';
    for (const p of patterns) {
      elements.redactTagsEl.appendChild(makeChip(p, () => {
        patterns = patterns.filter((x) => x !== p);
        render();
      }));
    }
  }

  function add(raw: string) {
    const p = raw.trim();
    if (!p || patterns.includes(p)) return;
    patterns.push(p);
    render();
  }

  elements.redactAddBtn.addEventListener('click', () => {
    add(elements.redactInput.value);
    elements.redactInput.value = '';
    elements.redactInput.focus();
  });
  elements.redactInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(elements.redactInput.value);
      elements.redactInput.value = '';
    }
  });
  elements.redactRecommendedBtn.addEventListener('click', () => {
    RECOMMENDED_PATTERNS.forEach(add);
  });

  render();

  return {
    get: () => patterns,
    replace: (next) => {
      patterns = [...next];
      render();
    },
  };
}

function makeChip(pattern: string, onRemove: () => void): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.textContent = pattern;
  const removeBtn = document.createElement('button');
  removeBtn.className = 'tag-chip-remove';
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', `Remove ${pattern}`);
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', onRemove);
  chip.appendChild(removeBtn);
  return chip;
}
