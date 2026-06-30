import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

// Used by search terms generated from facetsConfig (depth, height, width,
// dimension) via generateRemainingSearchTerms.
class IndexedRange extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const operator = searchTerm.getComparisonOperator();

    this.requireRangeOperator(searchTerm.getName(), operator);

    return {
      ctsConstraints: [
        cts.fieldRangeQuery(
          termConfig.getIndexReferences(),
          operator,
          termValue,
        ),
      ],
    };
  }

  mayTokenizeValue() {
    return false;
  }

  getRequiredRuntimeSearchTermProperties() {
    return ['comp'];
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return null;
  }

  getDefaultSearchOptionsName() {
    return null;
  }
}

const PATTERN_NAME_INDEXED_RANGE = 'indexedRange';
SearchPatternBase.register(PATTERN_NAME_INDEXED_RANGE, new IndexedRange());

export { PATTERN_NAME_INDEXED_RANGE };
