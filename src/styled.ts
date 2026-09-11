// Entry of the full bundle: the stylesheet is loaded here, not in index.ts,
// so that the published index.d.ts carries no stylesheet import.
import '../assets/quill-cursors.scss';

export {default, Cursor} from './index.js';
