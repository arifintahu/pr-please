export interface Draft {
  title: string;
  body: string;
}

export function getTitleInput(): HTMLInputElement | null {
  return document.querySelector('input[name="pull_request[title]"]');
}

export function getBodyInput(): HTMLTextAreaElement | null {
  return document.querySelector('textarea[name="pull_request[body]"]');
}

export function getDraftFromPage(): Draft {
  return {
    title: getTitleInput()?.value ?? '',
    body: getBodyInput()?.value ?? '',
  };
}

export function currentPrUrl(): string {
  return window.location.href.split('?')[0];
}

export function collectCommits(): string[] {
  const commitElements = document.querySelectorAll(
    '.js-commits-list-item p.mb-1 a.markdown-title, .commit-message code a'
  );
  return Array.from(commitElements)
    .map((e) => e.textContent?.trim())
    .filter((t): t is string => Boolean(t));
}

function shouldOverwrite(existing: string, generated: string): boolean {
  const ex = existing.trim();
  const gen = generated.trim();
  if (!ex) return true;
  if (!gen) return false;
  return gen.length >= ex.length;
}

export function applyResult(data: { title: string; description: string }) {
  const titleInput = getTitleInput();
  const bodyInput = getBodyInput();

  if (titleInput && shouldOverwrite(titleInput.value, data.title)) {
    titleInput.value = data.title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (bodyInput && shouldOverwrite(bodyInput.value, data.description)) {
    bodyInput.value = data.description;
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function extraContextKey(prUrl: string): string {
  return `prp:extra:${prUrl}`;
}

export async function loadExtraContext(prUrl: string): Promise<string> {
  if (!chrome?.storage?.session) return '';
  return new Promise((resolve) => {
    chrome.storage.session.get([extraContextKey(prUrl)], (res) => {
      resolve((res?.[extraContextKey(prUrl)] as string) || '');
    });
  });
}

export async function saveExtraContext(prUrl: string, value: string): Promise<void> {
  if (!chrome?.storage?.session) return;
  return new Promise((resolve) => {
    chrome.storage.session.set({ [extraContextKey(prUrl)]: value }, () => resolve());
  });
}

export function isExistingPrPage(): boolean {
  return (
    /\/pull\/\d+/.test(window.location.pathname) && !/\/compare\//.test(window.location.pathname)
  );
}
