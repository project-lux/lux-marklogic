const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

// Available implementations
import { SearchCriteriaProcessorGitHub } from './github-copilot/SearchCriteriaProcessorGitHub.mjs';
import { SearchCriteriaProcessorM365v1 } from './m365-copilot/SearchCriteriaProcessorM365v1.mjs';
import { SearchCriteriaProcessorM365v2 } from './m365-copilot/SearchCriteriaProcessorM365v2.mjs';
import { SearchCriteriaProcessorOriginal } from './SearchCriteriaProcessorOriginal.mjs';

// Change this number to switch implementations:
// 1 = SearchCriteriaProcessorGitHub
// 2 = SearchCriteriaProcessorM365v1
// 3 = SearchCriteriaProcessorM365v2
// 4 = SearchCriteriaProcessorOriginal
const implementationChoice = 2;

const SearchCriteriaProcessor = class {
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // Factory pattern: Get the implementation class and instantiate it
    const ImplementationClass = SearchCriteriaProcessor.getClass();
    console.log(`Using ${ImplementationClass.name}`);
    return new ImplementationClass(
      filterResults,
      facetsAreLikely,
      synonymsEnabled,
    );
  }

  // Function to get the class to use for static methods
  static getClass() {
    switch (implementationChoice) {
      case 1:
        return SearchCriteriaProcessorGitHub;
      case 2:
        return SearchCriteriaProcessorM365v1;
      case 3:
        return SearchCriteriaProcessorM365v2;
      case 4:
        return SearchCriteriaProcessorOriginal;
      default:
        throw new Error(
          `Invalid implementation choice: ${implementationChoice}. Use 1-4.`,
        );
    }
  }

  // Static method delegations
  static getSortTypeFromSortBinding(sortBinding) {
    return SearchCriteriaProcessor.getClass().getSortTypeFromSortBinding(
      sortBinding,
    );
  }

  static translateStringGrammarToJSON(scopeName, searchCriteria) {
    return SearchCriteriaProcessor.getClass().translateStringGrammarToJSON(
      scopeName,
      searchCriteria,
    );
  }

  static evalQueryString(queryStr) {
    return SearchCriteriaProcessor.getClass().evalQueryString(queryStr);
  }

  static hasNonOptionPropertyName(termValue) {
    return SearchCriteriaProcessor.getClass().hasNonOptionPropertyName(
      termValue,
    );
  }

  static getFirstNonOptionPropertyName(termValue) {
    return SearchCriteriaProcessor.getClass().getFirstNonOptionPropertyName(
      termValue,
    );
  }
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessor };
