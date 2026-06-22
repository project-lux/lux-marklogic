import { SORT_BINDINGS } from '../config/searchResultsSortConfig.mjs';
import * as utils from '../utils/utils.mjs';

const SORT_TYPE_SEMANTIC = 'semantic';
const SORT_TYPE_NON_SEMANTIC = 'nonSemantic';

const SortCriteria = class {
  #scopeName;
  #sortCriteriaStr;
  #semanticSortOption = null;
  #nonSemanticSortDescriptors = [];
  #relevanceSort = false;
  #randomSort = false;
  #warnings = [];

  // Accepts comma-delimited name:direction pairings where name is a defined sort binding and direction is optional.
  // When direction is specified, it needs to be 'asc' or 'desc'.  The default is 'asc'.
  constructor(scopeName, sortCriteriaStr) {
    this.#scopeName = scopeName;
    this.#sortCriteriaStr = sortCriteriaStr;
    this.#relevanceSort = true; // default
    this.#parse();
  }

  getSortCriteriaStr() {
    return this.#sortCriteriaStr;
  }

  isRelevanceSort() {
    return this.#relevanceSort;
  }

  isRandomSort() {
    return this.#randomSort;
  }

  // Random and semantic sort take precedence and do not require relevancy scores from MarkLogic.
  areScoresRequired() {
    return (
      !this.isRandomSort() &&
      !this.hasSemanticSortOption() &&
      this.#relevanceSort
    );
  }

  hasNonSemanticSortDescriptors() {
    return this.#nonSemanticSortDescriptors.length > 0;
  }

  getNonSemanticSortDescriptors() {
    return this.#nonSemanticSortDescriptors;
  }

  getSemanticSortOption() {
    return this.#semanticSortOption;
  }

  hasSemanticSortOption() {
    return this.#semanticSortOption !== null;
  }

  getWarnings() {
    return this.#warnings;
  }

  hasWarnings() {
    return this.#warnings.length > 0;
  }

  #parse() {
    let sortByName = '';
    let specifiedOrder = '';
    const sortList = utils.split(this.#sortCriteriaStr);
    sortList.every(function (item) {
      if (item != '') {
        [sortByName, specifiedOrder] = item.split(':');
        // As soon as we encounter 'random', clear any preceding criteria and go with it.
        if (sortByName?.toLowerCase() == 'random') {
          this.#clearSortState();
          this.#randomSort = true;
          return false;
        }
        // When 'relevance' is present, allow it to be used with others.  That should
        // exclude 'random' and semantic sort given their return statements.
        else if (sortByName?.toLowerCase() == 'relevance') {
          this.#relevanceSort = true;
        } else {
          const sortBinding = SORT_BINDINGS[sortByName];
          // Protect from sorting by a different scope's binding.
          if (
            sortBinding &&
            (this.#scopeName === 'multi' || // for archiveSortId
              sortByName.startsWith(this.#scopeName))
          ) {
            // As soon as we encounter a semantic sort binding, clear any preceding criteria and go with it.
            if (sortBinding.predicate) {
              this.#clearSortState();
              this.#semanticSortOption = {
                predicate: sortBinding.predicate,
                indexReference: sortBinding.indexReference,
                order: this.#getOrder(specifiedOrder, sortBinding.defaultOrder),
              };
              return false;
            } else {
              // Support multiple, inclusive of 'relevance' (above).
              this.#nonSemanticSortDescriptors.push({
                indexReference: sortBinding.indexReference,
                order: this.#getOrder(specifiedOrder, sortBinding.defaultOrder),
              });
            }
          } else if (sortBinding) {
            this.#warnings.push(
              `Unable to sort by '${sortByName}' as it is not a valid sort binding for the '${this.#scopeName}' search scope.`,
            );
          } else {
            this.#warnings.push(
              `Unable to sort by '${
                sortByName === '' ? this.#sortCriteriaStr : sortByName
              }' as it is not a defined sort binding.`,
            );
          }
        }
      }
      return true;
    }, this);
  }

  #getOrder(specifiedOrder, bindingOrder = null) {
    let order = 'asc';
    let orderFinalized = false;

    [specifiedOrder, bindingOrder].forEach((candidateOrder) => {
      if (!orderFinalized && candidateOrder) {
        if (this.#isValidOrder(candidateOrder)) {
          order = candidateOrder;
          orderFinalized = true;
        } else {
          this.#warnings.push(
            `'${candidateOrder}' is not a supported sort order; a default will be applied.`,
          );
        }
      }
    });

    // Complete the word as that's what ML requires
    return `${order}ending`;
  }

  #isValidOrder(order) {
    return order === 'desc' || order === 'asc';
  }

  #clearSortState() {
    this.#randomSort = false;
    this.#relevanceSort = false;
    this.#semanticSortOption = null;
    this.#nonSemanticSortDescriptors = [];
  }
};

export { SortCriteria, SORT_TYPE_NON_SEMANTIC, SORT_TYPE_SEMANTIC };
