export const INJECTED_STYLES = `
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

export function injectStylesheet() {
  const styleEl = document.createElement('style');
  styleEl.textContent = INJECTED_STYLES;
  document.head.appendChild(styleEl);
}
