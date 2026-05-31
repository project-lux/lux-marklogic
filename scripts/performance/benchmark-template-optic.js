'use strict';

// OPTIC BENCHMARK TEMPLATE
//
// Use this template to benchmark Optic plans in MarkLogic Query Console.  Copy this file, replace
// the plan, and adjust other values within the Configuration region as needed.
//
// Output format:
//   <scenarioName>
//     coldRuns=<n> coldMin=<ms> coldMax=<ms> coldAvg=<ms> coldStddev=<ms>
//     warmRuns=<n> warmMin=<ms> warmMax=<ms> warmAvg=<ms> warmStddev=<ms>
//     totalItemsRead=<n>
//
// IMPORTANT:
//   1. Do not blindly override Optic's optimization level or seed.  A previous version of the
//      benchmark template included a call to .prepare(1), which ended up increasing the warm
//      average duration from 37ms to 178ms.
//   2. The cache-clear function clears program, triple, triple-value, compressed-tree,
//      expanded-tree, and list caches.  Run from a quiet system to reduce noise.
//   3. Group cache clears require admin privileges.

const op = require('/MarkLogic/optic');

//#region Configuration

const scenarioName = `${xdmp.version()}-optic-<YOUR_SCENARIO_NAME>`;

// The user to execute the query as (for security/permissions testing).
const username = 'lux-dev-data-endpoint-consumer';

// When true, caches are not cleared, the query is only executed once,
// and the results are returned.
const returnResults = false;

// Set to a unique value to have the query's plan, optimization and execution
// details logged. Query will only run once when not null.
const traceId = null;

// Number of cold runs.  Each is preceded by a full cache clear in a separate transaction.
// Set to 0 to skip the cold pool entirely.
const coldRuns = 3;

// Number of warm runs.  Caches are NOT cleared between these.  Runs after the cold pool when
// both are configured.
const warmRuns = 10;

// Number of results to retrieve per execution.
const resultLimit = 20;

const plan = op
  .fromLexicons(
    {
      uri: cts.uriReference(),
      iri: cts.iriReference(),
      dataType: cts.fieldReference('anyDataTypeName', [
        'type=string',
        'collation=http://marklogic.com/collation/codepoint',
      ]),
    },
    null,
    op.fragmentIdCol('frag'),
  )
  .where(op.in(op.col('dataType'), ['Place']))
  .joinInner(
    op.fromSearch(cts.fieldWordQuery('placePrimaryName', 'manchester')),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  )
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

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
  // If inclined to set the optimization level or override the optimization seed, see header comment.
  const results = plan.limit(resultLimit).result().toArray();
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
result;
export default result;
