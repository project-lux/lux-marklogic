'use strict';

// Benchmark: page-slice hydration path for "woman greek art".
//
// SCP preparation, CTS search, and Optic hydration are all inside the
// timed function so every phase is captured.

import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { tryExecuteKeywordPageSlice } from '/lib/search/keywordPageSlice.mjs';
import { analyzeLeafCriteria } from '/lib/search/engine.mjs';

const op = require('/MarkLogic/optic');

//#region Configuration

const scenarioName = `${xdmp.version()}-WGA-page-slice`;
const username = 'lux-dev-data-endpoint-consumer';
const returnResults = false;
const traceId = null;
const coldRuns = 3;
const warmRuns = 10;
const page = 1;
const pageLength = 20;

const searchCriteria = {
  _scope: 'item',
  AND: [{ text: 'woman' }, { text: 'greek' }, { text: 'art' }],
};

//#endregion Configuration

//#region SCP helpers

function buildScp() {
  const scp = new SearchCriteriaProcessor();
  scp.prepare({
    searchCriteria,
    scopeName: 'item',
    includeSearchResults: true,
    allowMultiScope: false,
    page,
    pageLength,
    sortDelimitedStr: '',
  });
  return scp;
}

const zeroArityFun = () => {
  const scp = buildScp();
  const out = tryExecuteKeywordPageSlice(scp, analyzeLeafCriteria);
  if (out === null) {
    throw new Error('tryExecuteKeywordPageSlice returned null — not eligible.');
  }
  return out.rows.length;
};

//#endregion SCP helpers

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

function runOnce(func, userName) {
  const start = new Date();
  const result = fn.head(
    xdmp.invokeFunction(func, { userId: xdmp.user(userName) }),
  );
  const ms = new Date() - start;
  return { ms, result };
}

function microBenchmark(label, func, nCold, nWarm, userName) {
  if (returnResults === true || traceId != null) {
    return runOnce(func, userName).result;
  }

  const coldTimes = [];
  let totalItemsRead = 0;

  for (let i = 0; i < nCold; i++) {
    clearAllCaches();
    const { ms, result } = runOnce(func, userName);
    coldTimes.push(ms);
    totalItemsRead +=
      typeof result === 'number' ? result : (result?.length ?? 0);
  }

  const warmTimes = [];
  if (nCold === 0 && nWarm > 0) {
    runOnce(func, userName);
  }
  for (let i = 0; i < nWarm; i++) {
    const { ms, result } = runOnce(func, userName);
    warmTimes.push(ms);
    totalItemsRead +=
      typeof result === 'number' ? result : (result?.length ?? 0);
  }

  const cold = stats(coldTimes);
  const warm = stats(warmTimes);

  const parts = [label];
  if (nCold > 0) {
    parts.push(
      `coldRuns=${cold.n} coldMin=${cold.min} coldMax=${cold.max} coldAvg=${round(cold.avg)} coldStddev=${round(cold.stddev)}`,
    );
  }
  if (nWarm > 0) {
    parts.push(
      `warmRuns=${warm.n} warmMin=${warm.min} warmMax=${warm.max} warmAvg=${round(warm.avg)} warmStddev=${round(warm.stddev)}`,
    );
  }
  parts.push(`totalItemsRead=${totalItemsRead}`);
  return parts.join(' ');
}

//#endregion Benchmarking functions

const results = microBenchmark(
  scenarioName,
  zeroArityFun,
  coldRuns,
  warmRuns,
  username,
);
export default results;
