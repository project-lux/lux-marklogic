/*
 * Barrel module: importing this file guarantees every search pattern is
 * registered with SearchPatternBase.  All consumers that need the registry
 * or pattern-name constants should import from here instead of individual
 * pattern files.
 */

// Side-effect imports: each pattern self-registers with SearchPatternBase.
import '/lib/search/patterns/AnnTopK.mjs';
import '/lib/search/patterns/DateRange.mjs';
import '/lib/search/patterns/DocumentIdOrIri.mjs';
import '/lib/search/patterns/Geospatial.mjs';
import '/lib/search/patterns/HopInverse.mjs';
import '/lib/search/patterns/HopWithField.mjs';
import '/lib/search/patterns/Keyword.mjs';
import '/lib/search/patterns/IndexedRange.mjs';
import '/lib/search/patterns/IndexedValue.mjs';
import '/lib/search/patterns/IndexedWord.mjs';

// Re-export SearchPatternBase and constants so consumers need only one import.
export {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from '/lib/search/patterns/SearchPatternBase.mjs';
export { PATTERN_NAME_ANN_TOP_K } from '/lib/search/patterns/AnnTopK.mjs';
export { PATTERN_NAME_DATE_RANGE } from '/lib/search/patterns/DateRange.mjs';
export {
  PATTERN_NAME_DOCUMENT_ID,
  PATTERN_NAME_IRI,
} from '/lib/search/patterns/DocumentIdOrIri.mjs';
export { PATTERN_NAME_GEOSPATIAL } from '/lib/search/patterns/Geospatial.mjs';
export { PATTERN_NAME_HOP_INVERSE } from '/lib/search/patterns/HopInverse.mjs';
export { PATTERN_NAME_HOP_WITH_FIELD } from '/lib/search/patterns/HopWithField.mjs';
export { PATTERN_NAME_KEYWORD } from '/lib/search/patterns/Keyword.mjs';
export { PATTERN_NAME_INDEXED_RANGE } from '/lib/search/patterns/IndexedRange.mjs';
export { PATTERN_NAME_INDEXED_VALUE } from '/lib/search/patterns/IndexedValue.mjs';
export { PATTERN_NAME_INDEXED_WORD } from '/lib/search/patterns/IndexedWord.mjs';
