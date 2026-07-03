# Form Blocks

WordPress Gutenberg plugin that provides a block-based form builder. Forms can deliver submissions via email or to an external API endpoint. Field blocks render entirely in JavaScript (`save()`); the outer form block is a dynamic block rendered by PHP.

## Commands

```bash
npm run blocks:build   # Production build (minified, no source maps) → blocks/
npm run blocks:start   # Development build + file watcher
npm run blocks:lint    # Lint block JS with WordPress ESLint rules
```

> There is no test suite. Manual testing in a WordPress environment is the only way to verify behaviour.

## Architecture

### Directory layout

```
form-blocks.php              Plugin entry point — requires inc/ files and boots FormBlocks
inc/
  class-formblocks.php       Bootstrapper: wires block loader + form handler + textdomain
  class-formblocks-block-loader.php  Scans blocks/ and registers each block on init
  class-formblocks-form-handler.php  Handles form submission (admin-post.php action)
blocks-src/                  Source files — edit here, never edit blocks/
  _shared/field-controls.js  Shared JSX helpers: FieldLabel, FieldErrorSpan, FieldInspectorControls, resolveFieldId
  form/                      Dynamic form container block
    block.json               Block metadata + all attributes incl. custom message overrides
    index.js                 Editor UI (React) — InnerBlocks, InspectorControls
    render.php               Server-side render: computes form ID, stores transient, injects fbValues/fbErrors
    view.js                  Frontend script: repopulates fields + shows errors after failed submit; async fetch handler
    style.scss               Frontend + editor shared styles
    editor.scss              Editor-only styles (submit button preview)
  field-{type}/              One directory per field type: text, email, number, date, time, textarea, checkbox, radio, select
    block.json
    index.js                 Static block — save() renders the final HTML; no render.php
  submit-button/             Submit button block (RichText label, real <button> in save())
blocks/                      Compiled output — committed, never edited manually
webpack.blocks.config.js     Extends @wordpress/scripts default config; output → blocks/
```

### Block registration

`FormBlocks_Block_Loader` scans `blocks/` on `init`. For each subdirectory it prefers `block.json` (Path A — used by all current blocks) and falls back to detecting individual asset files (Path B — legacy). Adding a new block only requires placing its compiled output in `blocks/{slug}/`; no PHP changes are needed.

### Form submission flow

1. `render.php` computes a stable `$fb_form_id` = `substr(wp_hash(target|recipient|method|message|headers), 0, 20)`.
2. Block config + field configs are stored in the `fb_form_{id}` transient (TTL: 1 week).
3. The form POSTs to `admin-post.php` with `action=form_blocks_submit`.
4. `FormBlocks_Form_Handler::handle()` verifies nonce, loads the transient, validates fields, then either sends email / calls API or returns errors.
5. **Async** (`data-async="true"`): handler returns JSON `{success, message, errors?}`; `view.js` handles it without a page reload.
6. **Standard**: handler redirects back with `?form_blocks_status=success|error&form_blocks_id={id}` (and `form_blocks_eid={eid}` on validation failure). `render.php` reads the query args and injects status + field errors into the next page render.

### Field error / value preservation (standard submission)

On validation failure, `finish()` stores `['errors' => [...], 'values' => [...]]` in a `fb_verr_{eid}` transient (TTL: 5 min, single-use). `render.php` reads and deletes it, then injects `window.fbErrors` and `window.fbValues` via an inline `<script>`. `view.js` picks these up in `initFormBlocks()`.

**Critical**: `view.js` uses a `document.readyState === 'loading'` guard instead of a bare `DOMContentLoaded` listener. WordPress loads `viewScript` as a deferred footer script, so `DOMContentLoaded` has already fired by the time the script runs — the listener would never execute.

### Custom messages

All user-facing strings the plugin displays have corresponding block attributes (`msgSuccess`, `msgSendError`, `msgValidationError`, `msgNetworkError`, `msgRequired`, `msgInvalidEmail`, `msgInvalidNumber`, `msgInvalidTime`, `msgInvalidDate`, `msgPatternMismatch`, `msgInvalidSelect`) on the form block. Leaving an attribute empty falls back to the default `__()` translation. The form handler reads these from the stored config transient.

### Security notes

- Recipient email / API URL / message template are **never in the HTML** — only in the transient, keyed by an HMAC-derived ID. The ID is safe to expose in HTML.
- Nonce verified on every submission (`form_blocks_submit` action).
- All output in `render.php` is escaped (`esc_attr`, `esc_html`, `wp_json_encode`).
- `validate_fields()` runs server-side regardless of client-side HTML attributes.

## Coding conventions

- **PHP**: WordPress Coding Standards (WPCS). No trailing `?>` in included files. Nonce-verification ignores are annotated with `// phpcs:ignore WordPress.Security.NonceVerification`.
- **JS**: `@wordpress/scripts` ESLint config (`npm run blocks:lint`).
- **Field blocks are static** (`save()` produces all HTML). Do not add a `render.php` or `"render"` key to their `block.json` — the form block relies on the compiled HTML from `save()` being present in `$content`.
- **Form block is dynamic** (`render.php` wraps `$content` in `<form>`). The `save()` in `index.js` returns only `<InnerBlocks.Content />`.
- The `submit-button` edit uses `tagName="span"` in `RichText` (not `"button"`) to prevent the browser from intercepting the spacebar and activating the button instead of inserting a space.
