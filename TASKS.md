# TASKS

Feature roadmap and progress tracking for PR-Please. Check items as they ship. Group tasks under one feature should land together in a single PR unless noted.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Quick wins

### Preview before apply
Replace auto-write behavior with a confirmation modal showing the generated title/description.

- [ ] Add preview modal in `src/content.ts` (reuse `el()` + injected styles, no `innerHTML`)
- [ ] Buttons: **Apply**, **Regenerate**, **Edit** (opens editable textarea), **Discard**
- [ ] Keyboard: `Esc` closes, `Enter` applies
- [ ] `Regenerate` re-sends the same `GENERATE_PR` message without refetching the diff (cache last diff in-memory for the session)
- [ ] Remove the current auto-apply path in `handleGenerate` once the modal is default
- [ ] Update README screenshot/flow section

### Extra context field
Let users steer each generation with a one-liner.

- [ ] Add `<textarea>` to the generate modal ("Extra context (optional)")
- [ ] Plumb through `chrome.runtime.sendMessage` payload as `extraContext: string`
- [ ] Append to prompt in `constructPrompt()` in `src/background.ts` under a clear `User guidance:` header — only if non-empty
- [ ] Persist last value per-tab via `chrome.storage.session` so accidental closes don't lose it

### Respect repo PR template
Use `.github/PULL_REQUEST_TEMPLATE.md` (or `.github/pull_request_template.md`) when present.

- [ ] In `src/background.ts`, derive `{owner}/{repo}` from `prUrl`
- [ ] Fetch template via `https://raw.githubusercontent.com/{owner}/{repo}/HEAD/.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Fall back to case-variant path and `docs/` path; silent fail if 404
- [ ] Inject template into prompt as `Repo template to fill:` block; instruct model to populate it instead of using its default structure
- [ ] Add `host_permissions` for `https://raw.githubusercontent.com/*` in `manifest.json`
- [ ] Cache fetched template per-repo in `chrome.storage.session` for the session

### Preserve user-typed content
Treat existing title/body as hints instead of overwriting.

- [ ] In `src/content.ts`, read current `titleInput.value` and `bodyInput.value` before sending
- [ ] Forward as `userDraft: { title, body }` in the message
- [ ] In prompt: "User has already written the following — refine and expand, do not discard:"
- [ ] Skip overwriting a field if `userDraft.<field>` is non-empty *and* the model's output is empty/weaker (simple length heuristic)

---

## High impact

### Multi-provider support (OpenAI, Anthropic, Ollama)
Generalize the provider layer beyond Gemini.

- [ ] Extract `Provider` interface in `src/providers/types.ts` (`generate(prompt, settings): Promise<{title, description}>`)
- [ ] `src/providers/gemini.ts` — migrate existing Gemini code here
- [ ] `src/providers/openai.ts` — use `/v1/chat/completions`, JSON mode
- [ ] `src/providers/anthropic.ts` — use Messages API with `response_format` JSON enforcement
- [ ] `src/providers/ollama.ts` — `POST /api/generate` with `format: "json"`, default base `http://127.0.0.1:11434`
- [ ] Add `provider` field to `Settings` + storage; migrate existing saved settings (default = `gemini`)
- [ ] Update popup + in-page modal to show provider dropdown; model list changes per provider
- [ ] Update `manifest.json` host permissions (add `api.openai.com`, `api.anthropic.com`, `127.0.0.1:11434`)
- [ ] Update README provider matrix

### Pull linked issues into context
Enrich the diff context with issue bodies when commits/diff reference `#N`.

- [ ] Scan commits + diff for `#\d+` matches in `src/background.ts`
- [ ] Fetch up to 3 unique issues via `https://api.github.com/repos/{owner}/{repo}/issues/{n}` (unauth, 60/hr limit)
- [ ] Cache results per-issue in `chrome.storage.session` (1h TTL)
- [ ] Append to prompt under `Referenced issues:` block, truncated to 500 chars each
- [ ] Handle private repos gracefully (404 → skip silently)
- [ ] Add `host_permissions` for `https://api.github.com/*`

### Streaming output
Stream the generated content into the preview modal as it arrives.

- [ ] Depends on: Preview before apply
- [ ] Use Gemini `streamGenerateContent` (SDK + REST fallback)
- [ ] Use OpenAI/Anthropic/Ollama native streaming
- [ ] Pass chunks from background → content via `chrome.runtime.connect` port (not `sendMessage`)
- [ ] Render incrementally into textarea; show a subtle "streaming…" indicator
- [ ] Handle mid-stream errors (show partial + error banner, keep modal open)

### Regenerate with variations
Keep the last few generations available for comparison.

- [ ] Depends on: Preview before apply
- [ ] Maintain a ring buffer of up to 3 results in-memory per tab
- [ ] Add a small dropdown / `←/→` buttons to flip between them in the preview modal
- [ ] Clear buffer when the PR URL changes

---

## Broader scope

### Apply to existing PRs
Let users regenerate on already-open PRs, not just the creation page.

- [ ] Detect the "Edit" mode of an existing PR (`/pull/N` without creation form)
- [ ] Inject button into the edit-description toolbar
- [ ] Fetch diff from the existing `.diff` URL
- [ ] Same preview modal flow; write into the edit-description textarea

### Diff redaction
Let users blocklist paths before the diff leaves the browser.

- [ ] Add `redactPatterns: string[]` setting (glob syntax)
- [ ] In `filterDiff()`, match filename against patterns; replace body with `(Redacted: <path>)`
- [ ] Add default suggestions (`.env*`, `secrets/**`, `*.pem`) behind a "Recommended" checkbox
- [ ] Settings UI: tag-style input with add/remove

### Cost/token estimate
Surface approximate cost per generation.

- [ ] Read response metadata (`usageMetadata` for Gemini, `usage` for OpenAI/Anthropic)
- [ ] Maintain a provider→price-per-1M-tokens table; note prices are static & may drift
- [ ] Show `~ $0.0012 · 3.4k in / 680 out` under the preview
- [ ] Optional: running total in the popup (stored locally)

---

## Polish

### First-run walkthrough
Guide new users into a working state.

- [ ] Detect `!apiKey` on popup open; show an onboarding view
- [ ] Step 1: provider choice · Step 2: "Get a free Gemini API key →" (link to `ai.google.dev`) · Step 3: paste key
- [ ] Dismissible; return to normal popup after save

### Settings export / import
Round-trip the whole config as JSON.

- [ ] Popup: *Export* downloads `pr-please-settings.json` (omit API key by default; opt-in checkbox to include it in plain text with a clear warning)
- [ ] Popup: *Import* accepts a dropped / pasted JSON blob; validate shape before writing
- [ ] Useful for moving between machines and sharing prompt templates across a team

### Keyboard shortcut
Trigger generation without clicking.

- [ ] Add `commands` entry in `manifest.json` (e.g. `Alt+Shift+G`)
- [ ] Listen in `src/background.ts`; send message to active tab's content script
- [ ] Content script triggers the same generate flow
- [ ] Document in README; respect users remapping in `chrome://extensions/shortcuts`

### GitHub star count refresh
Avoid stale numbers.

- [x] Fetch + cache stars in popup (6h TTL) — shipped
- [ ] Re-fetch when TTL expires on popup open (currently works) — verify in tests
- [ ] Add a subtle refresh affordance on hover (optional)

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
