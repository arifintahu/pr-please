# TASKS_UX.md

UI/UX review and improvement tasks for PR-Please. Based on product and design reviews of the current extension popup.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Review Summary (Product)

The current popup has two root problems:
1. **Onboarding steps stack instead of replace** — a rendering bug where multiple wizard steps are visible simultaneously.
2. **No fixed height constraint** — content grows unbounded, forcing the user to scroll outside the Chrome popup viewport, which feels broken.

Below these are information architecture issues: advanced settings (API endpoint, custom URL, diff redaction) are surfaced at the same level as core settings (provider, API key), adding noise for 95% of users.

---

## Design Review (Color · Typography · Spacing · Components · Hierarchy · Consistency)

### Color & Contrast

**Green CTA is under WCAG AA at normal text sizes.**
`--accent-green: #238636` has a contrast ratio of ~2.8:1 against the page background `#0d1117`. White text on `#238636` is ~3.5:1, which barely passes for large/bold text only. Any 12–13px text inside a green element fails AA. The Save button at 14px bold passes, but status labels and badge text do not.

**Background depth delta is imperceptible.**
The four-level gray ramp (`#010409 → #0d1117 → #161b22 → #21262d`) is cloned from GitHub's dark mode. Adjacent steps differ by only ~7–8% lightness. Form inputs (`--bg-secondary: #161b22`) barely read as distinct from the page (`--bg-primary: #0d1117`). This collapses depth — inputs feel flat and un-editable at a glance.

**Intro card color is semantically wrong.**
The intro card uses `--accent-green-subtle` (green) with a green border. Green communicates success or confirmation. This card is informational ("current active provider"), so it should use a neutral color: `--bg-tertiary` background with `--border` border.

**Orange star hover is incongruous.**
`--accent-orange: #d29922` on star hover communicates "warning" to most users. Replace with a gold or yellow hue (`#f0c000`) that reads more clearly as "favorite/star" affordance.

**Status dot pulse is distracting in a dense popup.**
A permanently pulsing glow dot is appropriate for live status dashboards. For a "Settings saved" confirmation that auto-hides after 3 seconds, replace the pulsing dot with a static checkmark SVG — same green color, no animation.

---

### Typography

**11px hint text is too small.**
`.form-hint` and `.form-hint-plain` render at 11px. At 96 DPI (standard Windows), 11px text has ~4.4:1 contrast but is physically too small for comfortable reading. Minimum readable size in a UI control is 12px. Increase all hint text to 12px.

**Type scale is too compressed.**
Current scale: 11px · 12px · 13px · 14px · 16px across 5 levels in a 5px total range. Adjacent steps are only 1px apart, which creates no visible hierarchy weight difference. A better scale for this container: **11px (deprecated) → 12px → 13px → 15px → 17px** — same 5 levels, but the 15px and 17px jumps make title/button text visually distinct.

**`line-height: 1.4` is too tight for 12px text.**
`.intro-desc` at 12px / 1.4 line-height gives 16.8px between baselines — border-line readable. Increase to `line-height: 1.6` for all hint and description text below 14px.

**Monospace font duplicated inline in two places.**
`.tag-chip` and `.tag-input` define `font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` inline instead of using `var(--font-mono)`. If the font stack ever changes, these will drift. Use the variable.

---

### Spacing & Rhythm

**Three dividers destroy the hierarchy.**
The main settings body contains three `<div class="divider">` elements: after API Key, after Diff Redaction, and after Save. Three equal-weight horizontal rules fragment the page into 4 zones of identical visual weight. Dividers only communicate hierarchy when used sparingly — maximum one visible divider between fundamentally different groups. The second and third dividers should be removed; use padding/margin to create breathing room instead.

**`.divider` CSS has a `margin-top: auto` override bug.**
```css
.divider { margin: 16px 0; margin-top: auto; }
```
The second `margin-top: auto` overrides the first, so the top margin is `auto` (flex push-down). This is intentional for the first divider but applies to all three, causing unpredictable spacing on the second and third. Assign `margin-top: auto` only to the specific divider that should push down.

**Intro card consumes 11% of popup height on every visit.**
`padding: 12px 14px` + border + `margin-bottom: 16px` = ~60px. For returning users who open the popup to adjust model or check a setting, this card is purely decorative noise. Convert it to a compact single-line "active provider" indicator (icon + provider name + 8px padding) — saves ~30px.

**Save button vertical position is buried.**
The primary action is at position 5 in the scroll order (after intro, provider, endpoint, model, API key). In a good settings form, the primary action should be visible above the fold alongside the fields it applies to, or sticky at the bottom of the scroll container.

**Export/Import has no visual container.**
The export-import row floats without a label or section header. It looks like orphaned UI below the Save button. Group it with a small `font-size: 11px` section label "Data" or "Backup" above it, and give the row a top `padding-top: 4px` to breathe.

---

### Component Design

**Onboarding step icons are inconsistent and unpredictable.**
- Step 1: `✦` — Unicode character, styled green via CSS. Acceptable.
- Step 2: `🔑` — OS emoji. Cannot be styled with CSS `color`. Renders yellow on Windows, different on macOS. Breaks the visual language.
- Step 3: `✓` — Unicode checkmark, renders as plain text glyph without color on some systems.
- Ollama: `✓` — same.

Replace all four with inline SVGs from the existing `ICON_PATHS` set or simple purpose-built SVGs. Size them at 32×32px and color them with `--accent-green`.

**Tag chip border-radius is inconsistent.**
`.tag-chip` uses `border-radius: 20px` (pill). Every other surface in the UI uses `var(--radius-sm)` (6px). The pill shape has no functional justification here — chips aren't toggles or tags that benefit from pill shape. Change to `var(--radius-sm)` for consistency, or introduce a deliberate `--radius-pill` token if pill shapes are intentional.

**Tag chip remove button hit target is too small.**
The `×` remove button is 14px font-size with no padding, giving a ~14×14px hit target. Minimum accessible tap target is 24×24px. Add `padding: 4px` and `min-width: 20px; min-height: 20px` to `.tag-chip-remove`.

**Three button size variants in one popup.**
- `.btn-save`: `min-height: 36px`, `padding: 10px`, `font-size: 14px`
- `.btn-outline`: `padding: 8px 14px`, `font-size: 13px`
- `.btn-tag-add`: `padding: 6px 12px`, `font-size: 13px`

Three heights creates inconsistent alignment when buttons appear on the same row. Standardize to two: primary (`btn-save`, height ~36px) and secondary (`btn-outline`, `btn-tag-add` — same height ~32px).

**`.btn-link` hover has no transition.**
All other interactive elements have `transition: ... 150ms`. `.btn-link` jumps opacity directly. Add `transition: opacity 150ms`.

---

### Visual Hierarchy

**The intro card draws the eye first but offers no action.**
In F-pattern scanning, users hit the intro card before the most important control (Provider). A green card at the top acts as a CTA magnet but leads nowhere. Result: users scan past the card looking for controls, breaking the reading flow.

**Primary action (Save) is not visually anchored.**
The Save button should feel like a destination — the natural endpoint of the form flow. Currently it appears between two dividers at an arbitrary vertical position. Options: (a) always stick it to the bottom of the visible viewport (position sticky), or (b) remove the dividers above it so it visually follows directly from the last field.

**No hierarchy between section labels and field labels.**
"Provider" and "API Key" labels are 12px/600 weight, identical style. There's no visual distinction between section-level labels and field-level labels. The current design treats them all as field labels, which flattens the information architecture.

---

### Consistency

| Issue | Location | Fix |
|---|---|---|
| `border-radius: 6px` hardcoded | `.btn-tag-add` | Use `var(--radius-sm)` |
| `border-radius: 20px` hardcoded | `.tag-chip` | Use `var(--radius-sm)` or introduce token |
| Font stack duplicated inline | `.tag-chip`, `.tag-input` | Use `var(--font-mono)` |
| No hover transition | `.btn-link` | Add `transition: opacity 150ms` |
| `margin-top: auto` on all `.divider` | `popup.css` | Scope to first divider only |
| `accent-orange` on star hover | `.btn-star:hover .btn-star-label` | Change to gold (#f0c000) |

---

## P0 — Bugs (broken flows)

### Fix onboarding wizard step stacking
Steps 1 and 2 are both visible at the same time. Each `showOnboardStep()` call must explicitly set `hidden = true` on all other step elements before revealing the target step.

- [x] In `src/popup.ts`, update `showOnboardStep()` to explicitly hide all step containers (`onboardStep1`, `onboardStep2`, `onboardStep3`, `onboardStepOllama`) before showing the target
- [x] Verify Ollama variant step hides correctly when navigating back to step 1
- [x] Verify "Skip setup" dismisses the entire onboarding overlay and shows main settings

### Add fixed popup height to eliminate external scroll
Chrome clips popup content past ~600px without providing scrollbars. Content below that is simply cut off. The popup must have a bounded height with internal scrolling.

- [x] Set `height: 560px` on `body` in `src/popup.css`
- [x] Set `overflow-y: auto; flex: 1` on `.settings-body` so internal content scrolls within the fixed window
- [x] Verify onboarding view also fits within 560px at each step (no external scroll)

---

## P1 — Information Architecture

### Collapse advanced settings behind a disclosure section
"API Endpoint" and "Custom URL" are proxy settings used by fewer than 5% of users. Showing them by default pushes the Save button below the fold.

- [x] Add a `<details>` / disclosure row labeled "Advanced" below the Model field in `src/popup.html`
- [x] Move "API Endpoint" select and "Custom URL" input inside the Advanced section
- [x] Keep collapsed by default; persist open/closed state in `chrome.storage.local`
- [x] Update `src/popup.ts` to read/write the collapsed state

### Move Diff Redaction into the Advanced section
Diff Redaction is a power-user feature not needed during first setup or casual visits.

- [x] Relocate the Diff Redaction form group into the Advanced disclosure in `src/popup.html`
- [x] Ensure event wiring in `src/popup.ts` still reaches the relocated elements

---

## P2 — Color & Contrast

### Raise hint text from 11px to 12px
11px is below comfortable reading threshold at standard DPI.

- [x] Change `font-size: 11px` to `font-size: 12px` in `.form-hint` and `.form-hint-plain` in `src/popup.css`

### Fix divider `margin-top: auto` scoping
The rule applies to all three dividers but `auto` is only meaningful for the first one.

- [x] Remove `margin-top: auto` from `.divider` in `src/popup.css`
- [x] Add `margin-top: auto` as an inline style or separate class (`.divider-push`) only to the first divider in `src/popup.html`

### Reduce intro card to a compact provider indicator
The green card consumes ~60px and is purely decorative for returning users.

- [x] Reduce `.intro` padding to `8px 12px` and remove the title/description in favor of a single `provider name — active` line with the sparkle icon
- [x] Change background from `--accent-green-subtle` to `--bg-tertiary` with `--border` border (neutral, not green)

### Replace OS emoji icons in onboarding with SVGs
`🔑` on step 2 cannot be CSS-colored and renders inconsistently across OS.

- [x] Replace `🔑`, `✓`, and `✦` in `src/popup.html` onboarding steps with inline SVGs
- [x] Size at 28×28px, color via `fill: var(--accent-green)` or `color: var(--accent-green)`

---

## P3 — Component Polish

### Standardize tag chip border-radius and remove button size
- [x] Change `.tag-chip` `border-radius: 20px` → `var(--radius-sm)` in `src/popup.css`
- [x] Add `padding: 3px; min-width: 20px; min-height: 20px` to `.tag-chip-remove` for accessible hit target
- [x] Replace `.tag-chip` and `.tag-input` inline font stack with `var(--font-mono)`

### Standardize secondary button height
`.btn-outline` and `.btn-tag-add` have different padding and no `min-height`, so they render at different heights on the same row.

- [x] Add `min-height: 32px` to `.btn-outline` in `src/popup.css`
- [x] Add `min-height: 32px` to `.btn-tag-add` in `src/popup.css`
- [x] Change `.btn-tag-add` `border-radius: 6px` → `var(--radius-sm)`

### Add transition to `.btn-link` hover
- [x] Add `transition: opacity 150ms` to `.btn-link` in `src/popup.css`

### Shorten Export / Import button labels
"Export settings" wraps to two lines at 360px width.

- [x] Change label: "Export settings" → "Export" and "Import settings" → "Import" in `src/popup.html`
- [x] Add a `font-size: 11px; color: var(--text-muted)` label "Backup" above the export-import row as a section header
- [x] Verify the row fits on one line without wrapping

### Replace status dot with static checkmark for save confirmation
Permanent pulsing animation is distracting for a transient confirmation state.

- [x] Replace `.status-dot` (pulsing circle) with a static SVG checkmark icon in `src/popup.html` status row
- [x] Keep the green color; remove the `pulse` keyframe animation for the save status row (keep it only for error dot if used)

---

## Done

_(nothing yet — all items are new)_
