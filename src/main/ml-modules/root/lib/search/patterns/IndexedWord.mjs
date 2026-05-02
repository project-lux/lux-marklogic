import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class IndexedWord extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const termSearchOptions = searchTerm.getSearchOptions();

    // CTS constraint for same reason as indexedValue pattern.
    return {
      ctsConstraints: [
        searchTerm.isCompleteMatch()
          ? cts.fieldValueQuery(
              termConfig.getIndexReferences(),
              termValue,
              termSearchOptions,
            )
          : cts.fieldWordQuery(
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

const IndexedWordPattern = Object.freeze(new IndexedWord());

export { IndexedWordPattern };
