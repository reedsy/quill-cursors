import ICursorHighlight from './i-cursor-highlight';
export default class NoOpCursorHighlight implements ICursorHighlight {
    readonly name = "";
    setRange(): void;
    clear(): void;
    setVisible(): void;
    detach(): void;
}
