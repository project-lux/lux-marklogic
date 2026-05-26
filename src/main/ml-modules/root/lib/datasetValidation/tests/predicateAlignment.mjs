import { DatasetTestBase } from '../DatasetTestBase.mjs';
import {
  getSearchScopeNames,
  getSearchScopePredicates,
} from '../../searchScope.mjs';
import { getSearchTermsConfig } from '../../../config/searchTermsConfig.mjs';
import { SORT_BINDINGS } from '../../../config/searchResultsSortConfig.mjs';
import { shortenPredicate } from '../../search/prefixUtils.mjs';
import { isNonEmptyArray } from '../../../utils/utils.mjs';

const op = require('/MarkLogic/optic');

const TEST_ID = 'predicate-alignment';

// Derive configured predicates from runtime configs as CURIEs.
function getConfiguredPredicates() {
  const searchTermsConfig = getSearchTermsConfig();
  const predicateSet = new Set();

  // Search term predicates (already CURIEs in config).
  Object.keys(searchTermsConfig).forEach((scopeName) => {
    const scopeTerms = searchTermsConfig[scopeName];
    Object.keys(scopeTerms).forEach((termName) => {
      const termConfig = scopeTerms[termName];
      if (isNonEmptyArray(termConfig.predicates)) {
        termConfig.predicates.forEach((predicate) => {
          predicateSet.add(predicate);
        });
      }
    });
  });

  // Keyword search predicates (already CURIEs).
  getSearchScopeNames().forEach((scopeName) => {
    getSearchScopePredicates(scopeName).forEach((predicate) => {
      predicateSet.add(predicate);
    });
  });

  // Sort binding predicates (already CURIEs).
  Object.keys(SORT_BINDINGS).forEach((sortBindingName) => {
    const sortBinding = SORT_BINDINGS[sortBindingName];
    if (sortBinding.predicate) {
      predicateSet.add(sortBinding.predicate);
    }
  });

  return [...predicateSet].sort();
}

// Query all distinct predicates from the triple index via Optic, returned as CURIEs.
function getAllDatasetPredicates() {
  const s = op.col('s');
  const p = op.col('p');
  const o = op.col('o');
  return op
    .fromTriples(op.pattern(s, p, o))
    .groupBy(p)
    .result()
    .toArray()
    .map((row) => shortenPredicate(row.p + ''))
    .sort();
}

class PredicateAlignment extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Predicate Alignment';
  }
  getCategory() {
    return 'relational';
  }
  getSeverity() {
    return 'critical';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const configuredPredicates = getConfiguredPredicates();
    // Filter out MarkLogic internal numeric hash predicates.
    const allPredicates = getAllDatasetPredicates().filter(
      (p) => !/^\d+$/.test(p),
    );

    const referencedButDoesNotExist = configuredPredicates.filter(
      (item) => !allPredicates.includes(item),
    );
    const existsButNotReferenced = allPredicates.filter(
      (item) => !configuredPredicates.includes(item),
    );

    // Score: 1.0 minus the proportion of configured predicates that are missing.
    let score = 1.0;
    if (
      configuredPredicates.length > 0 &&
      referencedButDoesNotExist.length > 0
    ) {
      score = parseFloat(
        (
          (configuredPredicates.length - referencedButDoesNotExist.length) /
          configuredPredicates.length
        ).toFixed(4),
      );
    }

    const message =
      referencedButDoesNotExist.length === 0
        ? `All ${configuredPredicates.length} configured predicates exist in the dataset.`
        : `${referencedButDoesNotExist.length} configured predicate(s) not found in dataset.`;

    return {
      score: score,
      pass: score >= context.threshold,
      message: message,
      result: {
        referencedButDoesNotExist: referencedButDoesNotExist,
        existsButNotReferenced: existsButNotReferenced,
        totalPredicatesInDataset: allPredicates.length,
        totalPredicatesInConfig: configuredPredicates.length,
      },
    };
  }
}

DatasetTestBase.register(TEST_ID, new PredicateAlignment());

export { TEST_ID };
