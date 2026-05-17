import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class IndexedValue extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const termSearchOptions = searchTerm.getSearchOptions();

    // CTS constraint rather than op.eq on a range lexicon: simple column value
    // comparisons do not support wildcarding, stemming, or sensitivity options
    // (case, whitespace, diacritics, and punctuation).
    //
    // This pattern also subsumed the propertyValue pattern.  Should there be a
    // need to use the universal index, re-instate the propertyValue pattern and
    // use cts.jsonPropertyValueQuery therein.  Dropped support of correcting the
    // case of a dataType, as was done for recordType search terms.
    return {
      ctsConstraints: [
        cts.fieldValueQuery(
          termConfig.getIndexReferences(),
          termValue,
          termSearchOptions,
        ),
      ],
    };
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }

  getDefaultSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }
}

const PATTERN_NAME_INDEXED_VALUE = 'indexedValue';
SearchPatternBase.register(PATTERN_NAME_INDEXED_VALUE, new IndexedValue());

export { PATTERN_NAME_INDEXED_VALUE };
