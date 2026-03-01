import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Minimal Highlight implementation for jsdom (CSS Custom Highlight API)
class MockHighlight {
  private _ranges = new Set<Range>();
  add(r: Range) { this._ranges.add(r); }
  delete(r: Range) { this._ranges.delete(r); }
  clear() { this._ranges.clear(); }
  has(r: Range) { return this._ranges.has(r); }
  [Symbol.iterator]() { return this._ranges[Symbol.iterator](); }
}

const highlightRegistry = new Map<string, MockHighlight>();

vi.stubGlobal('Highlight', MockHighlight);
vi.stubGlobal('CSS', { highlights: highlightRegistry });

// Reset highlight registry between tests for isolation
beforeEach(() => {
  highlightRegistry.clear();
});
