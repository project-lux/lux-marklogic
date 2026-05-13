import { SORT_BINDINGS } from '../config/searchResultsSortConfig.mjs';
import * as utils from '../utils/utils.mjs';

const DEFAULT = 'default';

const SORT_TYPE_MULTI_SCOPE = 'multi';
const SORT_TYPE_SEMANTIC = 'semantic';
const SORT_TYPE_NON_SEMANTIC = 'nonSemantic';

const SortCriteria = class {
  // Accepts comma-delimited name:direction pairings where name is a defined sort binding and direction is optional.
  // When direction is specified, it needs to be 'asc' or 'desc'.  The default is 'asc'.
  // When name is 'random', we are to use a random score for each search result.
  // When name is 'relevance', we are to sort by score (highest to lowest, depending on direction).
  constructor(sortCriteriaStr) {
    this.sortCriteriaStr = sortCriteriaStr;
    this.scoresRequired = DEFAULT; // can switch to a boolean value.
    this.multiScopeSortOption = null;
    this.semanticSortOption = null;
    this.nonSemanticSortDescriptors = [];
    this.warnings = [];
    this._parse();
  }

  getSortCriteriaStr() {
    return this.sortCriteriaStr;
  }

  areScoresRequired() {
    return this.scoresRequired === DEFAULT || this.scoresRequired;
  }

  conditionallySetScoresRequired(bool) {
    if (this.scoresRequired !== true) {
      this.scoresRequired = bool;
    }
  }

  hasNonSemanticSortDescriptors() {
    return this.nonSemanticSortDescriptors.length > 0;
  }

  getNonSemanticSortDescriptors() {
    return this.nonSemanticSortDescriptors;
  }

  getMultiScopeSortOption() {
    return this.multiScopeSortOption;
  }

  hasMultiScopeSortOption() {
    return this.multiScopeSortOption !== null;
  }

  getSemanticSortOption() {
    return this.semanticSortOption;
  }

  hasSemanticSortOption() {
    return this.semanticSortOption !== null;
  }

  getWarnings() {
    return this.warnings;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  _parse() {
    let sortByName = '';
    let specifiedOrder = '';
    const sortList = utils.split(this.sortCriteriaStr);
    sortList.every(function (item) {
      if (item != '') {
        [sortByName, specifiedOrder] = item.split(':');
        if (
          utils.isNonEmptyString(sortByName) &&
          sortByName.toLowerCase() == 'random'
        ) {
          this.conditionallySetScoresRequired(true);
          // TODO: determine if random sort needs Optic support via nonSemanticSortDescriptors (less likely).
          return false;
        } else if (
          utils.isNonEmptyString(sortByName) &&
          sortByName.toLowerCase() == 'relevance'
        ) {
          this.conditionallySetScoresRequired(true);
          // TODO: determine if relevance sort needs Optic support via nonSemanticSortDescriptors (likely).
          return false;
        } else {
          const sortBinding = SORT_BINDINGS[sortByName];
          if (sortBinding) {
            if (sortBinding.subSorts) {
              this.multiScopeSortOption = {
                order: this._getOrder(specifiedOrder, 'asc'),
                subSortConfigs: sortBinding.subSorts.map(
                  (sortName) => SORT_BINDINGS[sortName],
                ),
              };
            } else if (sortBinding.predicate) {
              this.semanticSortOption = {
                predicate: sortBinding.predicate,
                indexReference: sortBinding.indexReference,
                order: this._getOrder(specifiedOrder, sortBinding.defaultOrder),
              };
            } else {
              this.conditionallySetScoresRequired(false);
              this.nonSemanticSortDescriptors.push({
                indexReference: sortBinding.indexReference,
                order: this._getOrder(specifiedOrder, sortBinding.defaultOrder),
              });
            }
          } else {
            this.warnings.push(
              `Unable to sort by '${
                sortByName === '' ? this.sortCriteriaStr : sortByName
              }' as it is not a defined sort binding.`,
            );
          }
        }
      }
      return true;
    }, this);
  }

  _getOrder(specifiedOrder, bindingOrder = null) {
    let order = 'asc';
    let orderFinalized = false;

    [specifiedOrder, bindingOrder].forEach((candidateOrder) => {
      if (!orderFinalized && candidateOrder) {
        if (this._isValidOrder(candidateOrder)) {
          order = candidateOrder;
          orderFinalized = true;
        } else {
          this.warnings.push(
            `'${candidateOrder}' is not a supported sort order; a default will be applied.`,
          );
        }
      }
    });

    // Complete the word as that's what ML requires
    return `${order}ending`;
  }

  _isValidOrder(order) {
    return order === 'desc' || order === 'asc';
  }
};

export {
  SortCriteria,
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
};
