import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class Keyword extends SearchPatternBase {
  apply(searchCriteriaProcessor, searchTerm, patternOptions, requestOptions) {
    const keyword = searchTerm.getChildCriteria();

    return {
      criteria: [
        {
          OR: [{ keywordNoHop: keyword }, { referencedBy: keyword }],
        },
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

const KeywordPattern = Object.freeze(new Keyword());

export { KeywordPattern };
