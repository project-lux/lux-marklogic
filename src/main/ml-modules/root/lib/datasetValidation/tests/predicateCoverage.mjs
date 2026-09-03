import { DatasetTestBase } from '/lib/datasetValidation/DatasetTestBase.mjs';
import { TENANT_OWNER } from '/lib/securityLib.mjs';
import {
  getSearchScopeNames,
  getSearchScopePredicates,
} from '/lib/searchScope.mjs';
import { getSearchTermsConfig } from '/config/searchTermsConfig.mjs';
import { SORT_BINDINGS } from '/config/searchResultsSortConfig.mjs';
import { expandPredicate } from '/lib/search/prefixUtils.mjs';
import {
  invokeAsUnit,
  isNonEmptyArray,
  sortObj,
  upToFirstUpperCaseCharacter,
} from '/utils/utils.mjs';

const TEST_ID = 'predicate-coverage';
const DEFAULT_DELTA_THRESHOLD_PERCENT = 10;

// Collect all predicates referenced by search terms, keyword search, and sort configs.
function getConfiguredPredicates() {
  const searchTermsConfig = getSearchTermsConfig();
  const predicateTermMap = {};

  // Search term predicates.
  Object.keys(searchTermsConfig).forEach((scopeName) => {
    const scopeTerms = searchTermsConfig[scopeName];
    Object.keys(scopeTerms).forEach((termName) => {
      const termConfig = scopeTerms[termName];
      if (isNonEmptyArray(termConfig.predicates)) {
        termConfig.predicates.forEach((predicate) => {
          if (!predicateTermMap[predicate]) {
            predicateTermMap[predicate] = [];
          }
          predicateTermMap[predicate].push(`${scopeName}.${termName}`);
        });
      }
    });
  });

  // Keyword search predicates.
  getSearchScopeNames().forEach((scopeName) => {
    getSearchScopePredicates(scopeName).forEach((predicate) => {
      if (!predicateTermMap[predicate]) {
        predicateTermMap[predicate] = [];
      }
    });
  });

  // Sort binding predicates.
  Object.keys(SORT_BINDINGS).forEach((sortBindingName) => {
    const sortBinding = SORT_BINDINGS[sortBindingName];
    if (sortBinding.predicate) {
      const scopeName = upToFirstUpperCaseCharacter(sortBindingName);
      if (!predicateTermMap[sortBinding.predicate]) {
        predicateTermMap[sortBinding.predicate] = [];
      }
      predicateTermMap[sortBinding.predicate].push(`${scopeName}.sort`);
    }
  });

  return predicateTermMap;
}

// Estimate document counts for each predicate.
function estimatePredicateCounts(predicateTermMap) {
  const estimates = {};
  Object.keys(predicateTermMap).forEach((predicate) => {
    // cts.estimate returns xs.unsignedLong; coerce to JS number for
    // reliable === comparisons and || fallbacks.
    estimates[predicate] = Number(
      cts.estimate(
        cts.jsonPropertyValueQuery('predicate', expandPredicate(predicate)),
      ),
    );
  });
  return estimates;
}

function computeScore(
  predicateTermMap,
  estimates,
  baselineResult,
  deltaThresholdPercent,
) {
  const predicates = Object.keys(predicateTermMap);
  if (predicates.length === 0) {
    return { score: 1.0, zeroCountPredicates: [], predicateDetails: {} };
  }

  const zeroCountPredicates = [];
  const predicateDetails = {};

  predicates.forEach((predicate) => {
    const estimate = estimates[predicate] || 0;
    const detail = {
      estimate: estimate,
      terms: predicateTermMap[predicate],
    };

    if (baselineResult && baselineResult.predicates) {
      const baselineDetail = baselineResult.predicates[predicate];
      if (baselineDetail) {
        detail.baselineEstimate = baselineDetail.estimate;
        if (baselineDetail.estimate > 0) {
          detail.deltaPercent = parseFloat(
            (
              ((estimate - baselineDetail.estimate) / baselineDetail.estimate) *
              100
            ).toFixed(2),
          );
        }
      }
    }

    if (estimate === 0) {
      zeroCountPredicates.push(predicate);
    }

    predicateDetails[predicate] = detail;
  });

  // Score: proportion of predicates with non-zero counts.
  let score =
    (predicates.length - zeroCountPredicates.length) / predicates.length;

  // If baseline is present, also factor in large deltas.
  if (baselineResult && baselineResult.predicates) {
    let largeDeltas = 0;
    predicates.forEach((predicate) => {
      const detail = predicateDetails[predicate];
      if (
        detail.deltaPercent !== undefined &&
        Math.abs(detail.deltaPercent) > deltaThresholdPercent
      ) {
        largeDeltas++;
      }
    });
    if (largeDeltas > 0) {
      const deltaScore = (predicates.length - largeDeltas) / predicates.length;
      score = Math.min(score, deltaScore);
    }
  }

  return {
    score: parseFloat(score.toFixed(4)),
    zeroCountPredicates: zeroCountPredicates.sort(),
    predicateDetails: sortObj(predicateDetails),
  };
}

class PredicateCoverage extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Predicate Coverage';
  }
  getCategory() {
    return 'relational';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const predicateTermMap = getConfiguredPredicates();
    const unitNames = context.unitNames || [];
    const config = context.config || {};
    const deltaThresholdPercent =
      config.deltaThresholdPercent != null
        ? config.deltaThresholdPercent
        : DEFAULT_DELTA_THRESHOLD_PERCENT;

    // Primary estimates (current user context).
    const estimates = estimatePredicateCounts(predicateTermMap);
    const { score, zeroCountPredicates, predicateDetails } = computeScore(
      predicateTermMap,
      estimates,
      context.baseline,
      deltaThresholdPercent,
    );

    // Per-unit estimates.
    const unitResults = {};
    unitNames.forEach((unitName) => {
      if (unitName === TENANT_OWNER) {
        return;
      }
      try {
        const unitEstimates = invokeAsUnit(unitName, () =>
          estimatePredicateCounts(predicateTermMap),
        );
        const unitScored = computeScore(
          predicateTermMap,
          unitEstimates,
          context.baseline && context.baseline.unitResults
            ? context.baseline.unitResults[unitName]
            : null,
          deltaThresholdPercent,
        );
        unitResults[unitName] = {
          score: unitScored.score,
          zeroCountPredicates: unitScored.zeroCountPredicates,
          predicates: unitScored.predicateDetails,
        };
      } catch (e) {
        unitResults[unitName] = { error: e.message };
      }
    });

    const message =
      zeroCountPredicates.length === 0
        ? 'All configured predicates have matching documents.'
        : `${zeroCountPredicates.length} configured predicate(s) have zero matching documents.`;

    if (zeroCountPredicates.length > 0) {
      context.addWarningFinding(message);
    } else if (score < 1.0) {
      context.addWarningFinding(
        'Predicate count deltas exceeded the configured threshold.',
      );
    } else {
      context.addInformationalFinding(message);
    }

    context.setScore(score);
    context.setMessage(message);

    return {
      predicates: predicateDetails,
      zeroCountPredicates: zeroCountPredicates,
      unitResults: unitResults,
    };
  }
}

DatasetTestBase.register(TEST_ID, new PredicateCoverage());

export { TEST_ID };
