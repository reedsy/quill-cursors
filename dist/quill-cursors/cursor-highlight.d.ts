import ICursorHighlight from './i-cursor-highlight';
export default class CursorHighlight implements ICursorHighlight {
    static readonly NAME_PREFIX = "ql-cursor-highlight";
    static readonly SELECTION_FADE = "var(--ql-cursor-selection-fade, 0.3)";
    private static _hasWarnedUnsupported;
    static isSupported(): boolean;
    static warnIfUnsupported(): void;
    private static _safeColor;
    private static _nextNumber;
    readonly name: string;
    private readonly _color;
    private readonly _priority;
    private _highlight;
    private _sheet;
    private _root;
    constructor(color: string);
    setRange(range: Range | null, root: Node): void;
    clear(): void;
    setVisible(visible: boolean): void;
    detach(): void;
    private _register;
    private _attach;
    private _adoptSheetInto;
    private _removeSheet;
    private _buildSheet;
    private _styleRoot;
}
