'use strict';

// Benchmark: standard Optic path for "woman greek art" (scope: item).
//
// Replicates the plan that engine.mjs/assemblePlan would build for a
// keyword-only AND query. buildKeywordCtsQuery is called inside the timed
// function so its cts.values IRI materialization (~49K IRIs per term) is
// included in the measurement — matching real request cost.

const op = require('/MarkLogic/optic');
import { buildKeywordCtsQuery } from '/lib/search/patterns/Keyword.mjs';
import { DEFAULT_SEARCH_OPTIONS_KEYWORD } from '/lib/appConstants.mjs';

//#region Configuration

const scenarioName = `${xdmp.version()}-WGA-standard`;
const username = 'lux-dev-data-endpoint-consumer';
const returnResults = false;
const traceId = null;
const coldRuns = 3;
const warmRuns = 10;
const resultLimit = 20;

const termValues = ['woman', 'greek', 'art'];
const scopeName = 'item';
const scopeDataTypes = ['DigitalObject', 'HumanMadeObject'];

//#endregion Configuration

//#region Benchmarking functions

function round(x, places = 0) {
  return Number.parseFloat(x).toFixed(places);
}
function stats(arr) {
  if (arr.length === 0) return { n: 0, min: 0, max: 0, avg: 0, stddev: 0 };
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const stddev = Math.sqrt(
    arr.map((x) => (x - mean) * (x - mean)).reduce((a, b) => a + b, 0) / n,
  );
  return { n, min: Math.min(...arr), max: Math.max(...arr), avg: mean, stddev };
}

// Clear all caches in a separate transaction.  Each xdmp.invokeFunction with
// transactionMode:'update' runs in its own transaction.
function clearAllCaches() {
  xdmp.invokeFunction(
    () => {
      xdmp.programCacheClear();
      xdmp.tripleCacheClear();
      xdmp.tripleValueCacheClear();
      xdmp.groupCacheClear(xdmp.group('Default'), [
        'compressed-tree-cache',
        'expanded-tree-cache',
        'list-cache',
      ]);
    },
    { transactionMode: 'update' },
  );
}

// Run the query once in its own transaction as the target user.  Returns { ms, result }.
function runOnce(func, userName) {
  const start = new Date();
  const result = fn.head(
    xdmp.invokeFunction(func, { userId: xdmp.user(userName) }),
  );
  const ms = new Date() - start;
  return { ms, result };
}

function microBenchmark(label, func, coldRuns, warmRuns, userName) {
  if (returnResults === true || traceId != null) {
    return runOnce(func, userName).result;
  }

  const coldTimes = [];
  let totalItemsRead = 0;

  for (let i = 0; i < coldRuns; i++) {
    clearAllCaches();
    const { ms, result } = runOnce(func, userName);
    coldTimes.push(ms);
    totalItemsRead +=
      typeof result === 'number' ? result : (result?.length ?? 0);
  }

  const warmTimes = [];
  // If no cold pool, do one ignored priming run so warm reflects a primed plan cache.
  if (coldRuns === 0 && warmRuns > 0) {
    runOnce(func, userName);
  }
  for (let i = 0; i < warmRuns; i++) {
    const { ms, result } = runOnce(func, userName);
    warmTimes.push(ms);
    totalItemsRead +=
      typeof result === 'number' ? result : (result?.length ?? 0);
  }

  const cold = stats(coldTimes);
  const warm = stats(warmTimes);

  const parts = [label];
  if (coldRuns > 0) {
    parts.push(
      `coldRuns=${cold.n} coldMin=${cold.min} coldMax=${cold.max} coldAvg=${round(cold.avg)} coldStddev=${round(cold.stddev)}`,
    );
  }
  if (warmRuns > 0) {
    parts.push(
      `warmRuns=${warm.n} warmMin=${warm.min} warmMax=${warm.max} warmAvg=${round(warm.avg)} warmStddev=${round(warm.stddev)}`,
    );
  }
  parts.push(`totalItemsRead=${totalItemsRead}`);
  return parts.join(' ');
}

const zeroArityFun = () => {
  // Build CTS queries including cts.values IRI materialization per term.
  const ctsQueries = termValues.map((v) =>
    buildKeywordCtsQuery({
      termValues: [v],
      termScopeName: scopeName,
      searchOptions: DEFAULT_SEARCH_OPTIONS_KEYWORD,
    }),
  );
  const ctsQuery = cts.andQuery(ctsQueries);

  // Replicate assemblePlan's lexicon + fromSearch join for relevance sort.
  let plan = op
    .fromLexicons(
      {
        uri: cts.uriReference(),
        iri: cts.iriReference(),
        dataType: cts.fieldReference('anyDataTypeName'),
      },
      null,
      op.fragmentIdCol('frag'),
    )
    .where(op.in(op.col('dataType'), scopeDataTypes));

  plan = plan.joinInner(
    op.fromSearch(ctsQuery, null, null, { scoreMethod: 'logtfidf' }),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  );

  plan = plan
    .groupBy(
      ['uri'],
      [
        op.sample('dataType', op.col('dataType')),
        op.max('score', op.col('score')),
      ],
    )
    .orderBy(op.desc(op.col('score')))
    .select([
      op.as('id', op.col('uri')),
      op.as('type', op.col('dataType')),
      'score',
    ]);

  const results = plan.limit(resultLimit).result().toArray();
  if (returnResults) {
    return { length: results.length, results };
  }
  return results.length;
};

//#endregion Benchmarking functions

const result = microBenchmark(
  scenarioName,
  zeroArityFun,
  coldRuns,
  warmRuns,
  username,
);
result;
export default result;
