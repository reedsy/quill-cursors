// Type declarations for the CSS Custom Highlight API.
// The built-in lib.dom types only ship with TypeScript 5.5+, so declare the
// small surface we use here, mirroring the lib.dom shape so this file can
// simply be deleted when TypeScript is upgraded.
// https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API

type HighlightType = 'highlight' | 'spelling-error' | 'grammar-error';

interface Highlight extends Set<AbstractRange> {
  priority: number;
  type: HighlightType;
}

declare var Highlight: {
  prototype: Highlight;
  new(...initialRanges: AbstractRange[]): Highlight;
};

interface HighlightRegistry extends Map<string, Highlight> {
}

declare var HighlightRegistry: {
  prototype: HighlightRegistry;
  new(): HighlightRegistry;
};

declare namespace CSS {
  // Deliberately typed as optional, unlike lib.dom: this API is feature-
  // detected at runtime, and the type should force callers to check.
  const highlights: HighlightRegistry | undefined;
}
