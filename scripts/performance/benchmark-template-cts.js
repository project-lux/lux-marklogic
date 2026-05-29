'use strict';

// CTS BENCHMARK TEMPLATE
//
// Use this template to benchmark CTS queries in MarkLogic Query Console.  Copy this file, update
// getQuery, and adjust other values within the Configuration region as needed.
//
// Output format (when not returning results or estimates):
//   <scenarioName> firstRun=<ms> warmRuns=<n> warmMin=<ms> warmMax=<ms> warmAvg=<ms> stddev=<ms> totalItemsRead=<n>
//
// IMPORTANT: Clear caches before running to get a true cold firstRun and be aware of concurrent demand:
//   xdmp.programCacheClear(); xdmp.tripleCacheClear(); xdmp.tripleValueCacheClear()
//   xdmp.groupCacheClear(xdmp.group("Default"), ["compressed-tree-cache", "expanded-tree-cache", "list-cache"]);

//#region Configuration

const scenarioName = `${xdmp.version()}-cts-<YOUR_SCENARIO_NAME>`;

// The user to execute the query as (for security/permissions testing).
const username = 'lux-dev-data-endpoint-consumer';

// When true, only a cts.estimate is calculated (no actual search).
const justEstimate = false;

// When true, the query is only executed once, and the results are returned.
// Ignored when justEstimate is true.
const returnResults = false;

// Number of warm runs. Ignored when other variables force the query to run once.
const warmRuns = 10;

// CTS search options. Adjust scoring method as needed.
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
  if (justEstimate === true || returnResults === true) {
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

const benchmark = function () {
  if (justEstimate === true) {
    const start = new Date();
    const estimate = cts.estimate(getQuery());
    return `Estimated ${estimate} results in ${
      new Date() - start
    } milliseconds.`;
  } else {
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
  }
};

//#endregion Benchmarking functions

microBenchmark(scenarioName, benchmark, warmRuns, username);
