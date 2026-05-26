import { DatasetTestBase } from '../DatasetTestBase.mjs';
import { TENANT_OWNER } from '../../securityLib.mjs';
import { invokeAsUnit, sortObj } from '../../../utils/utils.mjs';

const TEST_ID = 'range-index-coverage';
const DEFAULT_DELTA_THRESHOLD_PERCENT = 10;

// Retrieve the names of all range field indexes configured in the database.
function getConfiguredRangeFieldIndexNames() {
  const admin = require('/MarkLogic/admin.xqy');
  const config = admin.getConfiguration();
  return admin
    .databaseGetRangeFieldIndexes(config, xdmp.database())
    .toArray()
    .map((node) => node.xpath('*:field-name/string()') + '')
    .filter((name) => name.length > 0)
    .sort();
}

// Count distinct values per range field index.
function estimateIndexValueCounts(indexNames) {
  const counts = {};
  indexNames.forEach((name) => {
    counts[name] = Number(
      fn.count(
        cts.fieldValues(name, null, ['concurrent', 'unchecked', 'score-zero']),
      ),
    );
  });
  return counts;
}

function computeScore(
  indexNames,
  counts,
  baselineResult,
  deltaThresholdPercent,
) {
  if (indexNames.length === 0) {
    return { score: 1.0, emptyIndexes: [], indexDetails: {} };
  }

  const emptyIndexes = [];
  const indexDetails = {};

  indexNames.forEach((name) => {
    const count = counts[name] || 0;
    const detail = { valueCount: count };

    if (baselineResult && baselineResult.indexes) {
      const baselineDetail = baselineResult.indexes[name];
      if (baselineDetail) {
        detail.baselineValueCount = baselineDetail.valueCount;
        if (baselineDetail.valueCount > 0) {
          detail.deltaPercent = parseFloat(
            (
              ((count - baselineDetail.valueCount) /
                baselineDetail.valueCount) *
              100
            ).toFixed(2),
          );
        }
      }
    }

    if (count === 0) {
      emptyIndexes.push(name);
    }

    indexDetails[name] = detail;
  });

  let score = (indexNames.length - emptyIndexes.length) / indexNames.length;

  if (baselineResult && baselineResult.indexes) {
    let largeDeltas = 0;
    indexNames.forEach((name) => {
      const detail = indexDetails[name];
      if (
        detail.deltaPercent !== undefined &&
        Math.abs(detail.deltaPercent) > deltaThresholdPercent
      ) {
        largeDeltas++;
      }
    });
    if (largeDeltas > 0) {
      const deltaScore = (indexNames.length - largeDeltas) / indexNames.length;
      score = Math.min(score, deltaScore);
    }
  }

  return {
    score: parseFloat(score.toFixed(4)),
    emptyIndexes: emptyIndexes.sort(),
    indexDetails: sortObj(indexDetails),
  };
}

class RangeIndexCoverage extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Range Index Coverage';
  }
  getCategory() {
    return 'indexing';
  }
  getSeverity() {
    return 'informational';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const indexNames = getConfiguredRangeFieldIndexNames();
    const unitNames = context.unitNames || [];
    const config = context.config || {};
    const deltaThresholdPercent =
      config.deltaThresholdPercent != null
        ? config.deltaThresholdPercent
        : DEFAULT_DELTA_THRESHOLD_PERCENT;

    const counts = estimateIndexValueCounts(indexNames);
    const { score, emptyIndexes, indexDetails } = computeScore(
      indexNames,
      counts,
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
        const unitCounts = invokeAsUnit(unitName, () =>
          estimateIndexValueCounts(indexNames),
        );
        const unitScored = computeScore(
          indexNames,
          unitCounts,
          context.baseline && context.baseline.unitResults
            ? context.baseline.unitResults[unitName]
            : null,
          deltaThresholdPercent,
        );
        unitResults[unitName] = {
          score: unitScored.score,
          emptyIndexes: unitScored.emptyIndexes,
          indexes: unitScored.indexDetails,
        };
      } catch (e) {
        unitResults[unitName] = { error: e.message };
      }
    });

    const message =
      emptyIndexes.length === 0
        ? `All ${indexNames.length} range field index(es) have values.`
        : `${emptyIndexes.length} of ${indexNames.length} range field index(es) have no values.`;

    return {
      score: score,
      pass: score >= context.threshold,
      message: message,
      result: {
        indexes: indexDetails,
        emptyIndexes: emptyIndexes,
        unitResults: unitResults,
      },
    };
  }
}

DatasetTestBase.register(TEST_ID, new RangeIndexCoverage());

export { TEST_ID };
