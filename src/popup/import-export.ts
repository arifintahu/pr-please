import { saveSettings, type StoredSettings } from '../utils';
import { isProviderId, type ProviderId } from '../providers';
import type { PopupElements } from './elements';
import type { RedactController } from './redact';
import { renderForProvider } from './settings-form';

const STATUS_DISPLAY_MS = 3000;

function validateImport(data: unknown): data is StoredSettings {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!isProviderId(d.provider)) return false;
  if (typeof d.providers !== 'object' || !d.providers) return false;
  return true;
}

function showImportStatus(elements: PopupElements, msg: string, isError = false) {
  elements.importStatusText.textContent = msg;
  elements.importStatusRow.hidden = false;
  elements.importStatusRow.classList.toggle('error', isError);
  setTimeout(() => {
    elements.importStatusRow.hidden = true;
  }, STATUS_DISPLAY_MS);
}

function buildExport(settings: StoredSettings, includeKeys: boolean): StoredSettings {
  return {
    provider: settings.provider,
    redactPatterns: settings.redactPatterns,
    providers: Object.fromEntries(
      Object.entries(settings.providers).map(([id, cfg]) => [
        id,
        {
          ...cfg,
          apiKeyEncoded: includeKeys ? cfg.apiKeyEncoded : '',
        },
      ])
    ) as StoredSettings['providers'],
  };
}

function triggerDownload(json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pr-please-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportExportContext {
  elements: PopupElements;
  settings: StoredSettings;
  redact: RedactController;
  setCurrentProviderId: (id: ProviderId) => void;
}

function wireExport(ctx: ImportExportContext) {
  ctx.elements.exportBtn.addEventListener('click', () => {
    const exportData = buildExport(ctx.settings, ctx.elements.exportIncludeKeys.checked);
    triggerDownload(JSON.stringify(exportData, null, 2));
  });
}

async function handleFileImport(ctx: ImportExportContext, file: File) {
  const { elements, settings } = ctx;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!validateImport(parsed)) {
      showImportStatus(elements, 'Invalid settings file format', true);
      return;
    }
    const merged: StoredSettings = {
      provider: parsed.provider,
      redactPatterns: Array.isArray(parsed.redactPatterns) ? parsed.redactPatterns : [],
      providers: { ...settings.providers, ...parsed.providers },
    };
    await saveSettings(merged);
    Object.assign(settings, merged);
    ctx.redact.replace(merged.redactPatterns);
    ctx.setCurrentProviderId(merged.provider);
    renderForProvider(elements, settings, merged.provider);
    showImportStatus(elements, 'Settings imported successfully');
  } catch {
    showImportStatus(elements, 'Failed to parse settings file', true);
  } finally {
    elements.importFile.value = '';
  }
}

function wireImport(ctx: ImportExportContext) {
  ctx.elements.importFile.addEventListener('change', async () => {
    const file = ctx.elements.importFile.files?.[0];
    if (!file) return;
    await handleFileImport(ctx, file);
  });
}

export function setupImportExport(ctx: ImportExportContext) {
  wireExport(ctx);
  wireImport(ctx);
}
