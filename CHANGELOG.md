# 5.0.0

### ⚠ BREAKING CHANGES

Selections are now rendered with the native
[CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
instead of manually-positioned rectangles ([#98](https://github.com/reedsy/quill-cursors/issues/98)).

* Browser support floor is now Chrome/Edge 111+, Safari 17.2+, Firefox 140+. Older
  browsers still render carets, flags and block-embed overlays, but not text
  selections (one console warning).
* The `<span class="ql-cursor-selections">` element in the cursor template is now only
  used for tinted overlays over block embeds; text selections no longer create any DOM
  elements. Templates without the element are tolerated (block embeds just won't be
  tinted for those cursors).
* `cursor.updateSelection(rects, container)` is replaced by
  `cursor.setSelectionRange(range: Range | null)` for text and
  `cursor.updateEmbedSelections(rects, container)` for block embeds.
* Inline embeds (e.g. formula markers) within a remote selection are no longer tinted,
  matching native selection painting; block embeds (e.g. video) still receive a tinted
  overlay rectangle.
* Dropped the `rangefix` and `resize-observer-polyfill` dependencies; the bundles are
  significantly smaller, and scroll/resize now only reposition carets and embed
  overlays (the browser repaints highlights natively).

### Features

* `cursor.highlightName` exposes the `CSS.highlights` registry name, so applications
  can layer extra styling via `::highlight(<name>)`.
* Selection highlight styles use constructable stylesheets: CSP-safe in both bundles,
  Shadow-DOM-aware (the stylesheet is adopted into the editor's actual root).
* Cursor colors validated via `CSS.supports()` before being written into highlight
  rules; invalid values fall back to `transparent`.
* Overlapping selections from different cursors stack deterministically
  (later-created cursors paint on top) via `Highlight.priority`.

# 4.3.0
- Add `destroy()` method for proper cleanup: removes event listeners, disconnects ResizeObserver, clears pending timers, and removes the cursor container from the DOM
- Auto-teardown: when the Quill container is removed from the DOM, the module detects this on the next Quill event and calls `destroy()` automatically

# 4.2.0
- Add CSP-compatible core bundle (`dist/quill-cursors.core.js`) that does not inject inline styles, solving CSP violations for Shadow DOM users (#97)
- Extract standalone CSS file (`dist/quill-cursors.min.css`) for use with `<link>` tags or manual injection
- Add `package.json` exports map with `"./core"` and `"./css"` subpath exports

# 4.1.0
- Add RTL support: automatically detect right-to-left text direction and position cursors at the correct character edge

# 4.0.4
- Support CSS custom properties as input for the `createCursor` method by applying fade via `opacity` instead of modifying the alpha channel.

# 4.0.3
- Make event listeners passive

# 4.0.2
- Fix `ResizeObserver loop limit` error
- Pin `@typescript-eslint` to v5.41.0

# 4.0.0

### ⚠ BREAKING CHANGES
* Moved opening/closing flag logic from CSS to JS with `touchstart`, `mouseover` and `mousemove` events
  * Get rid of using `.show-flag` class and `:hover` selector for `.ql-cursor-flag`
  * Added extra `.hover` and `.no-pointer` classes to `.ql-cursor-caret-container` to help with toggling visibility state
  * `.ql-cursor-caret-container` has `z-index: -1` on touch devices
  * The «active» area on touch devices depends on `.ql-cursor-caret-container` paddings

# 3.1.2

- Relax `package.json` `engines`

# 3.1.1

- Fix clicking near another user's cursor on non-touch devices

# 3.1.0

- Align interface with Quill's Module class

# 3.0.2

- Fix `ResizeObserver` memory leak

# 3.0.1

- Fix inline image selection

# 3.0.0

- **BREAKING**: Remove most of the styling we'd previously applied to "core" Quill elements in order to stay as unopinionated as possible
- Use `.npmignore` to decrease the size of the package we publish
- Flip cursor flag horizontally when it is outside the bounds container
- Add typescript declaration files

# 2.3.1

- Hide flag immediately when actively toggled

# 2.3.0

- Feature: manually toggle cursor flag

# 2.2.2

- Fix 'null' being rendered in IE

# 2.2.1

- Fix bad npm publish

# 2.2.0

- Apply `pointer-events: none` CSS to selections so that other users' selections don't block mouse and touch interaction
- Ignore zero-width and zero-height selection rectangles
- Build selections from multiple `Range`s
- Fix max Quill index bug
- Add a local cursor transform for smoother experience on high-latency connections

# 2.1.1

- Sort selection `span` elements
- Deduplicate perfectly overlapping selection rectangles

# 2.1.0

- Add custom CSS class option
- Add HTML id attributes to the cursors
- Use ResizeObserver instead of window.onresize

# 2.0.3

- Fixes for editor with a fixed height container

# 2.0.2

- deploy.sh fix

# 2.0.1

- deploy.sh fix

# 2.0.0

- Move to TypeScript
- Breaking API changes
  - `setCursor` removed in favour of using `createCursor` and `moveCursor`
  - CSS is now in-lined in JavaScript
  - change to configuration options
  - this module will now emit extra `selection-change` events on `text-change`
- Add tests and Travis config
- Update Webpack
