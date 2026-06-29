import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

// As of June 2026, this pattern is not used.  The only time LUX is using
// cts.fieldRangeQuery is in DateRange.  Unlike this pattern, DateRange
// doesn't blindly use the comparison operator.  If we start using this pattern,
// consider having SearchTerm validate the operator within setProperty().
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
