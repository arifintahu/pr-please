# Code Guidelines — PR-Please

These rules apply to all source files under `src/`. They are enforced by ESLint and Prettier where possible, and by convention where not.

---

## File Size

- **Max 500 lines per file** (excluding blank lines and comments).
- If a file exceeds this, split by responsibility: one file per provider, one file per logical domain.
- Generated files (`dist/`, `*.lock`) are exempt.

## Function Size

- **Max 60 lines per function** (excluding blank lines and comments).
- Functions longer than 60 lines are doing too much. Extract named helpers — the name documents the intent.
- Event handlers should delegate to named functions. Keep the handler itself under 10 lines.

## Nesting Depth

- **Max 4 levels of indentation** inside any function.
- If you need a 5th level, early-return or extract a helper.
- Preferred pattern: flat code with guard clauses at the top, happy path at the bottom.

```typescript
// bad — deep nesting
function process() {
  if (a) {
    if (b) {
      if (c) {
        // ...
      }
    }
  }
}

// good — guard clauses
function process() {
  if (!a) return;
  if (!b) return;
  if (!c) return;
  // ...
}
```

## Parameters

- **Max 4 parameters per function.**
- Beyond 4, use an options object: `function foo(opts: { a, b, c, d, e })`.
- Options objects must be typed with an `interface` or inline type — no untyped objects.

## Line Length

- **Max 100 characters per line.**
- Enforced by Prettier (`printWidth: 100`).
- URLs in comments and strings are exempt.

---

## TypeScript Rules

- **No `any` without a comment explaining why.** Use `unknown` and narrow explicitly.
- **No non-null assertion (`!`) without a prior null check or comment** explaining the invariant.
- **No `var`** — use `const` by default, `let` only when the variable is reassigned.
- **No magic numbers.** Assign named constants for all non-trivial numeric literals:
  ```typescript
  // bad
  if (cache.size > 50) prune();

  // good
  const MAX_CACHE_ENTRIES = 50;
  if (cache.size > MAX_CACHE_ENTRIES) prune();
  ```
- **Prefer `===` over `==`** everywhere except `== null` (catches both null and undefined).

## Async

- **No floating promises.** Every `async` call must be `await`ed, returned, or explicitly `.catch()`ed.
- **No `async` functions that never `await` anything** — remove the `async` keyword.

## DOM (content.ts only)

- **No `innerHTML`.** All DOM construction uses `el()` / `createElement` / `textContent` / `appendChild`. This is a security invariant for XSS prevention. Never bypass it.
- **Event listeners must be removed** when the element they are attached to is removed from the DOM.

---

## Module Rules

- **One responsibility per file.** A provider file (`openai.ts`) only handles API calls — no DOM, no settings storage.
- **No circular imports.** `content.ts` may import from `utils.ts` and `providers/index.ts`. `background.ts` may import from `utils.ts`, `providers/`, and `costs.ts`. Neither imports from the other.
- **No re-exporting everything** (`export * from`). Export only what consumers need.

---

## Formatting

Prettier handles all formatting automatically. Never hand-format spacing, quotes, or trailing commas — let the tool do it.

```bash
npm run format        # write formatting to all src files
npm run format:check  # check without writing (used in CI)
```

Prettier config (`.prettierrc`):
- Single quotes
- Semicolons on
- 100 character print width
- LF line endings
- Trailing commas in ES5 positions

---

## Linting

ESLint with `@typescript-eslint` enforces the size limits above and TypeScript best practices.

```bash
npm run lint          # report all violations
npm run lint:fix      # auto-fix safe violations
```

Note: `tslint` is officially deprecated (2019). This project uses ESLint with `@typescript-eslint` instead — it covers all TSLint rules and more.

---

## Rule of Thumb

> If you have to scroll to read a function, it's too long.
> If you have to trace 3 files to understand a flow, the abstraction is wrong.
> If you're copy-pasting a block for the second time, extract it.
> If a variable name needs a comment to explain it, rename the variable.
