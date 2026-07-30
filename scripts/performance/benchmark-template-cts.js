'use strict';

// CTS BENCHMARK TEMPLATE
//
// Use this template to benchmark CTS queries in MarkLogic Query Console.  Copy this file, update
// getQuery, and adjust other values within the Configuration region as needed.
//
// Output format:
//   <scenarioName>
//     coldRuns=<n> coldMin=<ms> coldMax=<ms> coldAvg=<ms> coldStddev=<ms>
//     warmRuns=<n> warmMin=<ms> warmMax=<ms> warmAvg=<ms> warmStddev=<ms>
//     totalItemsRead=<n>
//
// IMPORTANT:
//   1. The cache-clear function clears program, triple, triple-value, compressed-tree,
//      expanded-tree, and list caches.  Run from a quiet system to reduce noise.
//   2. Group cache clears require admin privileges.

//#region Configuration

const scenarioName = `${xdmp.version()}-cts-<YOUR_SCENARIO_NAME>`;

// The user to execute the query as (for security/permissions testing).
const username = 'lux-dev-data-endpoint-consumer';

// When true, only a cts.estimate is calculated (no actual search).  Caches are not cleared and
// the query runs once.
const justEstimate = false;

// When true, caches are not cleared, the query is only executed once, and the results are
// returned.  Ignored when justEstimate is true.
const returnResults = false;

// Number of cold runs.  Each is preceded by a full cache clear in a separate transaction.
// Set to 0 to skip the cold pool entirely.
const coldRuns = 3;

// Number of warm runs.  Caches are NOT cleared between these.  Runs after the cold pool when
// both are configured.
const warmRuns = 10;

// CTS search options.  Adjust scoring method as needed.
const ctsSearchOptions = ['unfiltered', 'unfaceted', 'score-logtfidf'];

// Number of results to retrieve per execution.
const resultLimit = 20;

const getQuery = () => {
  return cts.fieldWordQuery('placePrimaryName', 'manchester');
};

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
  if (justEstimate === true || returnResults === true) {
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
  // If no cold pool, do one ignored priming run so warm reflects primed caches.
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
  if (justEstimate === true) {
    return cts.estimate(getQuery());
  }
  const results = fn
    .subsequence(cts.search(getQuery(), ctsSearchOptions), 1, resultLimit)
    .toArray()
    .map((doc) => {
      return { id: doc.baseURI, score: cts.score(doc) };
    });
  if (returnResults) {
    return {
      length: results.length,
      results,
    };
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
export default result;
