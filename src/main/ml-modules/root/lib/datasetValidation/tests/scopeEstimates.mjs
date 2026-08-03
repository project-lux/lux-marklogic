import { DatasetTestBase } from '../DatasetTestBase.mjs';
import { TENANT_OWNER } from '../../securityLib.mjs';
import { getScopeEstimates } from '../../environmentLib.mjs';
import { invokeAsUnit, sortObj } from '../../../utils/utils.mjs';

const TEST_ID = 'scope-estimates';
const DEFAULT_DELTA_THRESHOLD_PERCENT = 10;

function computeScore(estimates, baselineResult, deltaThresholdPercent) {
  const scopeNames = Object.keys(estimates).sort();
  if (scopeNames.length === 0) {
    return { score: 1.0, emptyScopes: [], scopeDetails: {} };
  }

  const emptyScopes = [];
  const scopeDetails = {};

  scopeNames.forEach((name) => {
    const estimate = estimates[name] || 0;
    const detail = { estimate: estimate };

    if (baselineResult && baselineResult.scopes) {
      const baselineDetail = baselineResult.scopes[name];
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
      emptyScopes.push(name);
    }

    scopeDetails[name] = detail;
  });

  let score = (scopeNames.length - emptyScopes.length) / scopeNames.length;

  if (baselineResult && baselineResult.scopes) {
    let largeDeltas = 0;
    scopeNames.forEach((name) => {
      const detail = scopeDetails[name];
      if (
        detail.deltaPercent !== undefined &&
        Math.abs(detail.deltaPercent) > deltaThresholdPercent
      ) {
        largeDeltas++;
      }
    });
    if (largeDeltas > 0) {
      const deltaScore = (scopeNames.length - largeDeltas) / scopeNames.length;
      score = Math.min(score, deltaScore);
    }
  }

  return {
    score: parseFloat(score.toFixed(4)),
    emptyScopes: emptyScopes.sort(),
    scopeDetails: sortObj(scopeDetails),
  };
}

class ScopeEstimates extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Scope Estimates';
  }
  getCategory() {
    return 'content';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const unitNames = context.unitNames || [];
    const config = context.config || {};
    const deltaThresholdPercent =
      config.deltaThresholdPercent != null
        ? config.deltaThresholdPercent
        : DEFAULT_DELTA_THRESHOLD_PERCENT;

    const estimates = getScopeEstimates();
    const { score, emptyScopes, scopeDetails } = computeScore(
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
        const unitEstimates = invokeAsUnit(unitName, () => getScopeEstimates());
        const unitScored = computeScore(
          unitEstimates,
          context.baseline && context.baseline.unitResults
            ? context.baseline.unitResults[unitName]
            : null,
          deltaThresholdPercent,
        );
        unitResults[unitName] = {
          score: unitScored.score,
          emptyScopes: unitScored.emptyScopes,
          scopes: unitScored.scopeDetails,
        };
      } catch (e) {
        unitResults[unitName] = { error: e.message };
      }
    });

    const scopeCount = Object.keys(estimates).length;
    const message =
      emptyScopes.length === 0
        ? `All ${scopeCount} search scope(s) have documents.`
        : `${emptyScopes.length} of ${scopeCount} search scope(s) have zero documents.`;

    if (emptyScopes.length > 0) {
      context.addCriticalFinding(message);
    } else if (score < 1.0) {
      context.addWarningFinding(
        'Scope estimate deltas exceeded the configured threshold.',
      );
    } else {
      context.addInformationalFinding(message);
    }

    context.setScore(score);
    context.setMessage(message);

    return {
      scopes: scopeDetails,
      emptyScopes: emptyScopes,
      unitResults: unitResults,
    };
  }
}

DatasetTestBase.register(TEST_ID, new ScopeEstimates());

export { TEST_ID };
