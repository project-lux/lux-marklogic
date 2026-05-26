import { DatasetTestBase } from '../DatasetTestBase.mjs';
import { getSearchTermsConfig } from '../../../config/searchTermsConfig.mjs';
import { expandPredicate } from '../../search/prefixUtils.mjs';
import { getSearchScopeTypes } from '../../searchScope.mjs';
import { sortObj } from '../../../utils/utils.mjs';

const TEST_ID = 'record-types-by-predicates';

// Collect all unique predicates referenced by search term configurations.
function getSearchTermPredicates() {
  const searchTermsConfig = getSearchTermsConfig();
  const allPredicates = new Set();
  Object.keys(searchTermsConfig).forEach((searchScope) => {
    const scopeTerms = searchTermsConfig[searchScope];
    Object.keys(scopeTerms).forEach((termName) => {
      const termConfig = scopeTerms[termName];
      if (termConfig.predicates) {
        termConfig.predicates.forEach((predicate) =>
          allPredicates.add(predicate),
        );
      }
    });
  });
  return [...allPredicates].sort();
}

// For each predicate, determine which record types have triples with that predicate.
function getRecordTypesByPredicate(predicates, types) {
  const predicatesToTypes = {};
  predicates.forEach((predicate) => {
    const predicateIri = expandPredicate(predicate);
    predicatesToTypes[predicate] = types.filter((type) => {
      return (
        Number(
          cts.estimate(
            cts.andQuery([
              cts.jsonPropertyValueQuery('dataType', type, ['exact']),
              cts.jsonPropertyValueQuery('predicate', predicateIri, ['exact']),
            ]),
          ),
        ) > 0
      );
    });
  });
  return predicatesToTypes;
}

function computeScore(predicatesToTypes, baselineResult) {
  const predicates = Object.keys(predicatesToTypes);
  if (predicates.length === 0) {
    return { score: 1.0, emptyPredicates: [], predicateDetails: {} };
  }

  const emptyPredicates = [];
  const predicateDetails = {};

  predicates.forEach((predicate) => {
    const types = predicatesToTypes[predicate];
    const detail = { types: types };

    if (baselineResult && baselineResult.predicates) {
      const baselineDetail = baselineResult.predicates[predicate];
      if (baselineDetail) {
        detail.baselineTypes = baselineDetail.types;
        const added = types.filter((t) => !baselineDetail.types.includes(t));
        const removed = baselineDetail.types.filter((t) => !types.includes(t));
        if (added.length > 0) {
          detail.typesAdded = added;
        }
        if (removed.length > 0) {
          detail.typesRemoved = removed;
        }
      }
    }

    if (types.length === 0) {
      emptyPredicates.push(predicate);
    }

    predicateDetails[predicate] = detail;
  });

  // If any predicate lost a record type association relative to baseline,
  // that is a hard no-go.
  let hasRemovedTypes = false;
  if (baselineResult && baselineResult.predicates) {
    predicates.forEach((predicate) => {
      const detail = predicateDetails[predicate];
      if (detail.typesRemoved && detail.typesRemoved.length > 0) {
        hasRemovedTypes = true;
      }
    });
  }

  const score = hasRemovedTypes
    ? 0
    : (predicates.length - emptyPredicates.length) / predicates.length;

  return {
    score: parseFloat(score.toFixed(4)),
    emptyPredicates: emptyPredicates.sort(),
    hasRemovedTypes: hasRemovedTypes,
    predicateDetails: sortObj(predicateDetails),
  };
}

class RecordTypesByPredicates extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Record Types by Predicates';
  }
  getCategory() {
    return 'relational';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const predicates = getSearchTermPredicates();
    const types = [...new Set(getSearchScopeTypes())].sort();
    const predicatesToTypes = getRecordTypesByPredicate(predicates, types);

    const { score, emptyPredicates, hasRemovedTypes, predicateDetails } =
      computeScore(predicatesToTypes, context.baseline);

    let message;
    if (hasRemovedTypes) {
      message =
        'One or more predicates lost record type associations relative to baseline.';
    } else if (emptyPredicates.length === 0) {
      message = `All ${predicates.length} predicate(s) have matching record types.`;
    } else {
      message = `${emptyPredicates.length} of ${predicates.length} predicate(s) have no matching record types.`;
    }

    if (hasRemovedTypes || emptyPredicates.length > 0) {
      context.addCriticalFinding(message);
    } else {
      context.addInformationalFinding(message);
    }

    context.setScore(score);
    context.setMessage(message);

    return {
      types: types,
      predicates: predicateDetails,
      emptyPredicates: emptyPredicates,
    };
  }
}

DatasetTestBase.register(TEST_ID, new RecordTypesByPredicates());

export { TEST_ID };
