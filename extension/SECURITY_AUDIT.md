# PR-Please Chrome Extension — Security Audit Report

**Date:** 2026-02-09
**Scope:** `extension/` directory — manifest, background service worker, content script, popup
**References:** [ChromeAudit](https://github.com/nullenc0de/ChromeAudit), [DeepStrike Chrome Extension Security Threats](https://deepstrike.io/blog/chrome-extensions-security-threats-risk-analysis)

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 4     |
| MEDIUM   | 5     |
| LOW      | 4     |

---

## HIGH Severity

### H1 — Missing Content Security Policy (CSP)

**File:** `public/manifest.json`

No `content_security_policy` is defined in the manifest. While Manifest V3 enforces a default CSP for the extension's own pages, explicitly declaring a restrictive CSP is a security best practice. The absence means:

- No explicit restriction on script sources for the extension's popup page.
- If a vulnerability were introduced (e.g., via a dependency), the default CSP provides less protection than a tightly scoped one.

**ChromeAudit check:** CSP verification — FAIL

**Recommendation:** Add an explicit CSP to the manifest:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'"
}
```

---

### H2 — API Key Stored in Plaintext in `chrome.storage.local`

**Files:** `src/popup.ts:125-128`, `src/content.ts:487`, `src/background.ts:122`

The Gemini API key is stored unencrypted in `chrome.storage.local`. Any other extension with the `storage` permission on the same browser profile, or anyone with physical/remote access to the machine, can read it.

```typescript
// popup.ts:145
chrome.storage.local.set(settings, () => { ... });

// background.ts:122
chrome.storage.local.get(['mode', 'apiKey', 'serviceUrl'], (result) => { ... });
```

**Risk:** API key theft leading to unauthorized usage and billing.

**Recommendation:**
- Use `chrome.storage.session` for transient secrets (cleared when browser closes).
- Consider encrypting the key at rest using a user-provided passphrase.
- At minimum, warn users prominently that the key is stored locally without encryption.

---

### H3 — Sensitive Code Data Sent to External Services Without User Consent Gate

**File:** `src/background.ts:24-48`

PR diff content (potentially proprietary source code) is sent to:
- **Local mode:** Google Generative AI API (`generativelanguage.googleapis.com`)
- **Remote mode:** Any URL configured in `serviceUrl`

There is no confirmation dialog, no data preview, and no opt-in before transmission. The user clicks "Generate" and their code diff is immediately exfiltrated.

```typescript
// background.ts:29 — fetches diff
const diffResponse = await fetch(diffUrl);

// background.ts:44 — sends to Google API
return await generateLocal(commits, cleanedDiff, settings.apiKey);

// background.ts:46 — sends to arbitrary remote service
return await generateRemote(commits, cleanedDiff, settings.serviceUrl);
```

**Risk:** Unintentional leakage of proprietary code, secrets in diffs (despite filtering `.env`, lock files could still contain tokens in code changes).

**Recommendation:**
- Show a confirmation dialog before first use on a repository.
- Display a summary of what data will be sent and to which endpoint.
- Allow users to review/redact diff content before sending.

---

### H4 — No Service URL Validation — Open Redirect / SSRF Pattern

**Files:** `src/background.ts:150-151`, `src/popup.ts:46-48`, `src/content.ts:401`

The user-configured `serviceUrl` is used directly in `fetch()` with no scheme, host, or format validation.

```typescript
// background.ts:151
const url = serviceUrl.endsWith('/') ? `${serviceUrl}generate` : `${serviceUrl}/generate`;
const response = await fetch(url, { method: 'POST', ... });

// popup.ts:48
fetch(pingUrl) // user-controlled URL
```

A user (or a compromised settings store) could set `serviceUrl` to:
- `file:///etc/passwd` (blocked by fetch in service workers, but still a bad pattern)
- An attacker-controlled domain to harvest code diffs
- Internal network addresses for SSRF reconnaissance

**Recommendation:**
- Validate URL scheme (only allow `http://` and `https://`).
- Consider an allowlist or at minimum a warning when the URL is not `localhost` or a known domain.
- Validate URL format with `new URL()` constructor and catch errors.

---

## MEDIUM Severity

### M1 — HTTP Host Permission (`http://localhost:3000/*`)

**File:** `public/manifest.json:13`

```json
"host_permissions": [
  "http://localhost:3000/*"
]
```

The manifest declares an HTTP (not HTTPS) host permission. While this is intended for local development, it:
- Grants the extension permission to interact with any insecure HTTP service on port 3000.
- Data sent over HTTP is visible to any local network observer (no TLS).
- The default `serviceUrl` in code is also `http://localhost:3000`.

**ChromeAudit check:** HTTP usage detection — FAIL

**Recommendation:**
- If the local service supports HTTPS, switch to `https://localhost:3000/*`.
- If HTTP is required for local dev, document the risk and consider removing it for production builds.

---

### M2 — Broad Wildcard Host Permissions

**File:** `public/manifest.json:11-15`

```json
"host_permissions": [
  "https://github.com/*",
  "http://localhost:3000/*",
  "https://generativelanguage.googleapis.com/*"
]
```

All three host permissions use broad wildcards (`/*`). This grants the extension access to all paths on these domains.

**ChromeAudit check:** Wildcard misuse detection — FLAGGED

- `https://github.com/*` — grants access to all GitHub pages, not just PR pages.
- `https://generativelanguage.googleapis.com/*` — grants access to all API endpoints, not just the generation endpoint.

**Recommendation:**
- Narrow `github.com` to `https://github.com/*/*/compare/*` and `https://github.com/*/*/pull/*` if feasible.
- Narrow the Google API permission to the specific endpoint path used.

---

### M3 — `innerHTML` Used Extensively in Content Script

**File:** `src/content.ts:259, 288, 310, 322, 337, 385`

The content script uses `innerHTML` in six locations to inject HTML into GitHub's DOM:

```typescript
wrapper.innerHTML = `...`;       // line 259
btn.innerHTML = `${ICONS...}`;   // lines 288, 310, 322
bar.innerHTML = `...`;           // line 337
modalOverlay.innerHTML = `...`;  // line 385
```

Currently, all values are static string templates using constants from `ICONS`. No user-controlled input flows into `innerHTML` **at present**. However:
- This pattern is fragile — a future change could introduce user data.
- It is flagged by ChromeAudit and static analysis tools.
- Manifest V3 CSP blocks inline scripts, but injected HTML attributes (e.g., `onerror`) could still be a vector.

**ChromeAudit check:** `innerHTML` detection — FLAGGED

**Recommendation:**
- Replace `innerHTML` with DOM API calls (`createElement`, `textContent`, `appendChild`).
- If `innerHTML` must be used, use a sanitization library (e.g., DOMPurify).

---

### M4 — External Font Loading in Content Script Leaks Browsing Data

**File:** `src/content.ts:17`

```typescript
const INJECTED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
  ...
`;
```

The content script injects a CSS `@import` that loads Google Fonts on every GitHub page where the content script runs (`https://github.com/*`). This:
- Sends a request to `fonts.googleapis.com` for every GitHub page visit, leaking the page URL via the `Referer` header.
- Allows Google to build a browsing profile of which GitHub repositories/PRs the user visits.
- Increases page load time on every GitHub page.

**Recommendation:**
- Bundle the font file with the extension.
- Or use system fonts only (the extension already has a system font fallback in the CSS).

---

### M5 — Potentially Unnecessary `scripting` Permission

**File:** `public/manifest.json:9`

```json
"permissions": [
  "storage",
  "activeTab",
  "scripting"
]
```

The `scripting` permission grants the ability to programmatically inject scripts into any page the extension has host access to. However, the content script is already declared statically in the manifest's `content_scripts` array. The `scripting` permission does not appear to be used anywhere in the code.

**Risk:** Unnecessary permissions increase attack surface. If the extension were compromised, `scripting` + `host_permissions` would allow arbitrary code execution on GitHub pages.

**Recommendation:**
- Remove `scripting` from permissions if it is not actively used.
- If it is needed for future features, document why.

---

## LOW Severity

### L1 — Error Messages May Leak Sensitive Information

**File:** `src/content.ts:323`

```typescript
alert(`Generation failed: ${err.message}`);
```

Error messages from `fetch()` failures or API errors are shown directly to the user via `alert()`. Depending on the error source, this could expose:
- Internal API error details.
- Network configuration information.
- Stack traces (in dev environments).

**Recommendation:**
- Show generic user-friendly error messages.
- Log detailed errors to `console.error` for debugging.

---

### L2 — `JSON.parse` Without Try-Catch on LLM Response

**File:** `src/background.ts:147`

```typescript
return JSON.parse(response.text());
```

The LLM response is parsed with `JSON.parse` without a try-catch. If the model returns malformed JSON, this throws an unhandled exception.

**Recommendation:**
- Wrap in try-catch and return a structured error.
- Validate the parsed object has the expected `title` and `description` fields.

---

### L3 — MutationObserver on Entire Document Body

**File:** `src/content.ts:499-502`

```typescript
const observer = new MutationObserver(() => {
  injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
```

The observer fires on every DOM mutation across the entire GitHub page. While not a direct security vulnerability, it:
- Causes `injectButton()` to run on every DOM change, including those triggered by other extensions.
- Could interact unexpectedly with other extensions or GitHub's own dynamic updates.
- Has a minor performance impact.

**Recommendation:**
- Narrow the observed target to the specific container where PR forms appear.
- Add debouncing to the observer callback.

---

### L4 — Default Service URL is HTTP Localhost

**Files:** `src/popup.ts:11`, `src/background.ts:126`, `src/content.ts:401`

The default service URL is hardcoded to `http://localhost:3000` in three separate locations. This:
- Creates inconsistency risk if one location is updated and others are not.
- Uses HTTP by default.

**Recommendation:**
- Define the default URL in a single shared constants file.
- Consider defaulting to HTTPS if the service supports it.

---

## Checklist Summary (ChromeAudit Criteria)

| Check | Status | Notes |
|-------|--------|-------|
| Wildcard in permissions | WARN | Broad `/*` wildcards on all host permissions |
| `document.write()` usage | PASS | Not used |
| `innerHTML` usage | WARN | 6 instances, all static templates currently |
| `eval()` usage | PASS | Not used |
| HTTP usage | FAIL | `http://localhost:3000` in host_permissions and defaults |
| CSP defined | FAIL | No explicit CSP in manifest |
| `externally_connectable` | PASS | Not declared (secure by default in MV3) |
| `web_accessible_resources` | PASS | Not declared, no resources exposed |
| Input sanitization | WARN | Service URL not validated before use in fetch |
| External resource loading | WARN | Google Fonts loaded from CDN in content script |

---

## Recommendations Priority

1. **Add explicit CSP** to manifest (quick win, high impact)
2. **Remove unused `scripting` permission** (quick win, reduces attack surface)
3. **Validate service URL** before use in fetch calls (prevents SSRF patterns)
4. **Bundle or remove external font** import (stops data leakage to Google)
5. **Add user consent gate** before sending code data to external services
6. **Encrypt or use session storage** for API key
7. **Replace `innerHTML`** with DOM API calls
8. **Remove or restrict HTTP** host permission for production
