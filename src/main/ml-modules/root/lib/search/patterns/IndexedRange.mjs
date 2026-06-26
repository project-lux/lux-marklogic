import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class IndexedRange extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();

    return {
      ctsConstraints: [
        cts.fieldRangeQuery(
          termConfig.getIndexReferences(),
          searchTerm.getComparisonOperator(),
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
