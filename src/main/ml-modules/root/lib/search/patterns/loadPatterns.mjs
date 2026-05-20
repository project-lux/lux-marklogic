/*
 * Barrel module: importing this file guarantees every search pattern is
 * registered with SearchPatternBase.  All consumers that need the registry
 * or pattern-name constants should import from here instead of individual
 * pattern files.
 */

// Side-effect imports: each pattern self-registers with SearchPatternBase.
import './AnnTopK.mjs';
import './DateRange.mjs';
import './DocumentIdOrIri.mjs';
import './Geospatial.mjs';
import './HopInverse.mjs';
import './HopWithField.mjs';
import './Keyword.mjs';
import './IndexedRange.mjs';
import './IndexedValue.mjs';
import './IndexedWord.mjs';

// Re-export SearchPatternBase and constants so consumers need only one import.
export {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from './SearchPatternBase.mjs';
export { PATTERN_NAME_ANN_TOP_K } from './AnnTopK.mjs';
export { PATTERN_NAME_DATE_RANGE } from './DateRange.mjs';
export {
  PATTERN_NAME_DOCUMENT_ID,
  PATTERN_NAME_IRI,
} from './DocumentIdOrIri.mjs';
export { PATTERN_NAME_GEOSPATIAL } from './Geospatial.mjs';
export { PATTERN_NAME_HOP_INVERSE } from './HopInverse.mjs';
export { PATTERN_NAME_HOP_WITH_FIELD } from './HopWithField.mjs';
export { PATTERN_NAME_KEYWORD } from './Keyword.mjs';
export { PATTERN_NAME_INDEXED_RANGE } from './IndexedRange.mjs';
export { PATTERN_NAME_INDEXED_VALUE } from './IndexedValue.mjs';
export { PATTERN_NAME_INDEXED_WORD } from './IndexedWord.mjs';
