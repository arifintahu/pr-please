import { parseGenerationJson } from './json-parse';
import {
  collectCommits,
  currentPrUrl,
  getDraftFromPage,
  loadExtraContext,
  saveExtraContext,
} from './page-state';
import { openPreviewModal, type PreviewHandles, type PreviewResult } from './preview-modal';

interface StreamMsg {
  type: 'chunk' | 'done' | 'error';
  text?: string;
  title?: string;
  description?: string;
  costEstimate?: string;
  message?: string;
}

function isStreamMsg(v: unknown): v is StreamMsg {
  return !!v && typeof v === 'object' && 'type' in v;
}

function resolveDonePayload(msg: StreamMsg, accumulated: string): PreviewResult {
  if (msg.title && msg.description) {
    return { title: msg.title, description: msg.description, costEstimate: msg.costEstimate };
  }
  const parsed = parseGenerationJson(accumulated);
  return { title: parsed.title, description: parsed.description, costEstimate: msg.costEstimate };
}

interface StreamOptions {
  prUrl: string;
  extraContext: string;
  useCachedDiff: boolean;
  onChunk: (text: string) => void;
  onDone: (result: PreviewResult) => void;
}

function openStreamPort(opts: StreamOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connect({ name: 'prp-stream' });
    let accumulated = '';
    let settled = false;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      try {
        port.disconnect();
      } catch {
        // Already disconnected.
      }
      fn();
    }

    port.onMessage.addListener((raw) => {
      if (!isStreamMsg(raw)) return;
      if (raw.type === 'chunk' && raw.text) {
        accumulated += raw.text;
        opts.onChunk(accumulated);
      } else if (raw.type === 'done') {
        settle(() => {
          try {
            opts.onDone(resolveDonePayload(raw, accumulated));
            resolve();
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
      } else if (raw.type === 'error') {
        settle(() => reject(new Error(raw.message || 'Unknown error')));
      }
    });

    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError;
      if (err) settle(() => reject(new Error(err.message)));
    });

    port.postMessage({
      action: 'STREAM_PR',
      commits: collectCommits(),
      prUrl: opts.prUrl,
      extraContext: opts.extraContext,
      userDraft: getDraftFromPage(),
      useCachedDiff: opts.useCachedDiff,
    });
  });
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message && !err.message.includes('<')) return err.message;
  if (typeof err === 'string' && !err.includes('<')) return err;
  return 'An unexpected error occurred. Check the console for details.';
}

async function runGeneration(preview: PreviewHandles, opts: { useCachedDiff: boolean }) {
  preview.setBusy(true, true);
  preview.setError(null);

  try {
    if (!chrome?.runtime?.connect) {
      throw new Error('Extension context invalidated. Please refresh the page.');
    }

    const prUrl = currentPrUrl();
    const extraContext = preview.extraTextarea.value.trim();
    await saveExtraContext(prUrl, extraContext);

    await openStreamPort({
      prUrl,
      extraContext,
      useCachedDiff: opts.useCachedDiff,
      onChunk: (text) => preview.setStreamingText(text),
      onDone: (result) => preview.setResult(result),
    });
  } catch (err) {
    console.error('PR-Please generation error:', err);
    preview.setError(safeErrorMessage(err));
  } finally {
    preview.setBusy(false);
  }
}

export async function handleGenerate() {
  if (document.getElementById('prp-preview-modal')) return;
  const prUrl = currentPrUrl();
  const savedExtra = await loadExtraContext(prUrl);
  const preview = openPreviewModal(savedExtra, (handles) =>
    runGeneration(handles, { useCachedDiff: true })
  );
  await runGeneration(preview, { useCachedDiff: false });
}
