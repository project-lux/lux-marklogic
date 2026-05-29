'use strict';

// OPTIC BENCHMARK TEMPLATE
//
// Use this template to benchmark Optic plans in MarkLogic Query Console.  Copy this file, replace the
// plan, and adjust other values within the Configuration region as needed.
//
// Output format (when not returning results or estimates):
//   <scenarioName> firstRun=<ms> warmRuns=<n> warmMin=<ms> warmMax=<ms> warmAvg=<ms> stddev=<ms> totalItemsRead=<n>
//
// IMPORTANT:
//   1. Clear caches before running to get a true cold firstRun and be aware of concurrent demand:
//      xdmp.programCacheClear(); xdmp.tripleCacheClear(); xdmp.tripleValueCacheClear()
//      xdmp.groupCacheClear(xdmp.group("Default"), ["compressed-tree-cache", "expanded-tree-cache", "list-cache"]);
//
//   2. Do not blindly override Optic's optimization level or seed.  A previous version of the benchmark
//      template included a call to .prepare(1), which ended up increasing the warm average duration from
//      37ms to 178ms.

const op = require('/MarkLogic/optic');

//#region Configuration

const scenarioName = `${xdmp.version()}-optic-<YOUR_SCENARIO_NAME>`;

// The user to execute the query as (for security/permissions testing).
const username = 'lux-dev-data-endpoint-consumer';

// When true, the query is only executed once, and the results are returned.
// Ignored when estimating.
const returnResults = false;

// Set to a unique value to have the query's plan, optimization and execution
// details logged. Query will only run once when not null.
const traceId = null;

// Number of warm runs. Ignored when other variables force the query to run once.
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
function getStandardDeviation(array) {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(
    array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n,
  );
}
function microBenchmark(label, func, warmRuns, userName) {
  let totalResults = 0;
  let startTime = new Date();
  const firstRunResults = fn.head(
    xdmp.invokeFunction(func, { userId: xdmp.user(userName) }),
  );
  let firstRunMs = new Date() - startTime;
  if (returnResults === true || traceId != null) {
    return firstRunResults;
  } else {
    totalResults += firstRunResults;
    let r = [];
    for (let i = 0; i < warmRuns; i++) {
      startTime = new Date();
      totalResults += fn.head(
        xdmp.invokeFunction(func, { userId: xdmp.user(userName) }),
      );
      r.push(new Date() - startTime);
    }
    const avg = r.reduce((a, b) => a + b) / r.length;
    const min = Math.min(...r);
    const max = Math.max(...r);
    const stddev = getStandardDeviation(r);
    return (
      label +
      ' firstRun=' +
      firstRunMs +
      ' warmRuns=' +
      warmRuns +
      ' warmMin=' +
      min +
      ' warmMax=' +
      max +
      ' warmAvg=' +
      round(avg) +
      ' stddev=' +
      round(stddev) +
      ' totalItemsRead=' +
      totalResults
    );
  }
}

const zeroArityFun = () => {
  // If inclined to set the optimization level or override the optimization seed, see header comment.
  return plan.limit(resultLimit).result().toArray();
};

//#endregion Benchmarking functions

const result = microBenchmark(scenarioName, zeroArityFun, warmRuns, username);
result;
export default result;
