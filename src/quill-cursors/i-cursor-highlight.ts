export default interface ICursorHighlight {
  readonly name: string;
  setRange(range: Range | null, root: Node): void;
  clear(): void;
  setVisible(visible: boolean): void;
  detach(): void;
}
