# TASKS

Feature roadmap and progress tracking for PR-Please. Check items as they ship. Group tasks under one feature should land together in a single PR unless noted.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Quick wins

### Preview before apply
Replace auto-write behavior with a confirmation modal showing the generated title/description.

- [x] Add preview modal in `src/content.ts` (reuse `el()` + injected styles, no `innerHTML`)
- [x] Buttons: **Apply**, **Regenerate**, **Edit** (opens editable textarea), **Discard**
- [x] Keyboard: `Esc` closes, `Enter` applies (Ctrl/Cmd+Enter — plain Enter would conflict with the body textarea)
- [x] `Regenerate` re-sends the same `GENERATE_PR` message without refetching the diff (cache last diff in-memory for the session)
- [x] Remove the current auto-apply path in `handleGenerate` once the modal is default
- [ ] Update README screenshot/flow section (needs real browser capture)

### Extra context field
Let users steer each generation with a one-liner.

- [x] Add `<textarea>` to the generate modal ("Extra context (optional)")
- [x] Plumb through `chrome.runtime.sendMessage` payload as `extraContext: string`
- [x] Append to prompt in `constructPrompt()` in `src/background.ts` under a clear `User guidance:` header — only if non-empty
- [x] Persist last value per-tab via `chrome.storage.session` so accidental closes don't lose it

### Respect repo PR template
Use `.github/PULL_REQUEST_TEMPLATE.md` (or `.github/pull_request_template.md`) when present.

- [x] In `src/background.ts`, derive `{owner}/{repo}` from `prUrl`
- [x] Fetch template via `https://raw.githubusercontent.com/{owner}/{repo}/HEAD/.github/PULL_REQUEST_TEMPLATE.md`
- [x] Fall back to case-variant path and `docs/` path; silent fail if 404
- [x] Inject template into prompt as `Repo template to fill:` block; instruct model to populate it instead of using its default structure
- [x] Add `host_permissions` for `https://raw.githubusercontent.com/*` in `manifest.json`
- [x] Cache fetched template per-repo in `chrome.storage.session` for the session

### Preserve user-typed content
Treat existing title/body as hints instead of overwriting.

- [x] In `src/content.ts`, read current `titleInput.value` and `bodyInput.value` before sending
- [x] Forward as `userDraft: { title, body }` in the message
- [x] In prompt: "User has already written the following — refine and expand, do not discard:"
- [x] Skip overwriting a field if `userDraft.<field>` is non-empty *and* the model's output is empty/weaker (simple length heuristic)

---

## High impact

### Multi-provider support (OpenAI, Anthropic, Ollama)
Generalize the provider layer beyond Gemini.

- [x] Extract `Provider` interface in `src/providers/types.ts` (`generate(prompt, settings): Promise<{title, description}>`)
- [x] `src/providers/gemini.ts` — migrate existing Gemini code here
- [x] `src/providers/openai.ts` — use `/v1/chat/completions`, JSON mode
- [x] `src/providers/anthropic.ts` — use Messages API (JSON enforced via system prompt + `anthropic-dangerous-direct-browser-access` for CORS)
- [x] `src/providers/ollama.ts` — `POST /api/generate` with `format: "json"`, default base `http://127.0.0.1:11434`
- [x] Add `provider` field to `Settings` + storage; migrate existing saved settings (default = `gemini`)
- [x] Update popup + in-page modal to show provider dropdown; model list changes per provider
- [x] Update `manifest.json` host permissions (add `api.openai.com`, `api.anthropic.com`, `127.0.0.1:11434`)
- [ ] Update README provider matrix (docs-only; not done in this pass)

### Pull linked issues into context
Enrich the diff context with issue bodies when commits/diff reference `#N`.

- [x] Scan commits + diff for `#\d+` matches in `src/background.ts`
- [x] Fetch up to 3 unique issues via `https://api.github.com/repos/{owner}/{repo}/issues/{n}` (unauth, 60/hr limit)
- [x] Cache results per-issue in `chrome.storage.session` (1h TTL)
- [x] Append to prompt under `Referenced issues:` block, truncated to 500 chars each
- [x] Handle private repos gracefully (404 → skip silently)
- [x] Add `host_permissions` for `https://api.github.com/*`

### Streaming output
Stream the generated content into the preview modal as it arrives.

- [x] Depends on: Preview before apply
- [x] Use Gemini `streamGenerateContent` (SDK + REST fallback)
- [x] Use OpenAI/Anthropic/Ollama native streaming
- [x] Pass chunks from background → content via `chrome.runtime.connect` port (not `sendMessage`)
- [x] Render incrementally into textarea; show a subtle "streaming…" indicator
- [x] Handle mid-stream errors (show partial + error banner, keep modal open)

### Regenerate with variations
Keep the last few generations available for comparison.

- [x] Depends on: Preview before apply
- [x] Maintain a ring buffer of up to 3 results in-memory per tab
- [x] Add a small dropdown / `←/→` buttons to flip between them in the preview modal
- [x] Clear buffer when the PR URL changes (module-level state resets on content-script reload on navigation)

---

## Broader scope

### Apply to existing PRs
Let users regenerate on already-open PRs, not just the creation page.

- [x] Detect the "Edit" mode of an existing PR (`/pull/N` without creation form)
- [x] Inject button into the edit-description toolbar (primary: after title input; fallback: before form actions when only body textarea present)
- [x] Fetch diff from the existing `.diff` URL (works via `prUrl + '.diff'` — same path as create flow)
- [x] Same preview modal flow; write into the edit-description textarea

### Diff redaction
Let users blocklist paths before the diff leaves the browser.

- [x] Add `redactPatterns: string[]` setting (glob syntax) to `StoredSettings`
- [x] In `filterDiff()`, match filename against patterns; replace body with `(Redacted: <path>)`
- [x] Add default suggestions (`.env*`, `secrets/**`, `*.pem`, `*.key`, `*.cert`) via "Recommended" button
- [x] Settings UI: tag-style input with add/remove in popup and in-page modal

### Cost/token estimate
Surface approximate cost per generation.

- [x] Read response metadata (`usageMetadata` for Gemini, `usage` for OpenAI/Anthropic, `eval_count` for Ollama)
- [x] Maintain a provider→price-per-1M-tokens table in `src/costs.ts`; note prices are static & may drift
- [x] Show `~ $0.0012 · 3.4k in / 680 out` under the preview (cost row in preview modal)
- [ ] Optional: running total in the popup (stored locally) — skipped (optional)

---

## Polish

### First-run walkthrough
Guide new users into a working state.

- [x] Detect `!apiKey` on popup open; show an onboarding view
- [x] Step 1: provider choice · Step 2: "Get a free Gemini API key →" (link to `ai.google.dev`) · Step 3: paste key
- [x] Dismissible; return to normal popup after save

### Settings export / import
Round-trip the whole config as JSON.

- [x] Popup: *Export* downloads `pr-please-settings.json` (omit API key by default; opt-in checkbox to include it in plain text with a clear warning)
- [x] Popup: *Import* accepts a dropped / pasted JSON blob; validate shape before writing
- [x] Useful for moving between machines and sharing prompt templates across a team

### Keyboard shortcut
Trigger generation without clicking.

- [x] Add `commands` entry in `manifest.json` (e.g. `Alt+Shift+G`)
- [x] Listen in `src/background.ts`; send message to active tab's content script
- [x] Content script triggers the same generate flow
- [ ] Document in README; respect users remapping in `chrome://extensions/shortcuts`

### GitHub star count refresh
Avoid stale numbers.

- [x] Fetch + cache stars in popup (6h TTL) — shipped
- [x] Re-fetch when TTL expires on popup open (currently works) — verify in tests
- [x] Add a subtle refresh affordance on hover (optional)

---

## Engineering / ops (not feature work, but worth tracking)

- [ ] Wire up GitHub Actions to run `npm run test:e2e` on every PR (workflow exists — verify it runs green once pushed)
- [ ] Add a second CI job for Chrome Web Store lint (`npx crx-lint dist/` or equivalent)
- [ ] Publish 1.0.0 to Chrome Web Store; add install badge + link to README
- [ ] Changelog / CHANGELOG.md with the convention already used in commit history (Conventional Commits)

---

## Done

- [x] Star count badge with GitHub API + 6h caching
- [x] API endpoint provider selection (Official / Localhost / Custom) in popup + in-page modal
- [x] WCAG-friendly popup redesign (label-for bindings, ARIA, focus-visible, `aria-live` status)
- [x] Split `npm test` (fast build) from `npm run test:e2e` (browser tests)
- [x] CI workflow scaffold at `.github/workflows/ci.yml`
