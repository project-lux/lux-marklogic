import op from '/MarkLogic/optic.mjs';
import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { COMPARATORS } from '../../SearchCriteriaProcessor.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class IndexedRange extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();

    // NOTE: If we switch to fromView, we can restrict criteria to a single object's values versus
    // including the values of all objects in the array.
    if (logicType === 'and') {
      const fieldCol = id + '_field';
      const constraint = COMPARATORS[searchTerm.getComparisonOperator()];
      // This requires that each term config only has one index reference. This is true today, but is it guaranteed?
      return {
        lexicons: {
          [fieldCol]: cts.fieldReference(termConfig.getIndexReferences()[0]),
        },
        constraints: [constraint(op.col(fieldCol), termValue)],
      };
    }

    // OR and NOT
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
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }

  getDefaultSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }
}

const IndexedRangePattern = Object.freeze(new IndexedRange());

export { IndexedRangePattern };
