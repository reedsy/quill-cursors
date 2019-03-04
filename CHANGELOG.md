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
