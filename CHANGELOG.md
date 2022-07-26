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
