import op from 'MarkLogic/optic.mjs';

// Variant 1: No Opt 1 — uses op.fromSearch + joinInner instead of plan.where(cts).
// Sort lexicon joined via joinLeftOuter to preserve results without sort values.
// MarkLogic sorts nulls LAST in both ASC and DESC (verified via fromLiterals test).
//
// TODO: multi-value lexicons — if a document can have multiple values in the sort
// lexicon, op.sample picks one arbitrarily. Address after locking onto an approach.

//#region Configuration
const sortDirection = 'ascending'; // 'ascending' or 'descending'
const offset = 0;
const limit = 20;
const runs = 3;
//#endregion

//#region Metrics helpers
function stats(values) {
  if (!values || values.length === 0)
    return { runs: 0, min: 0, max: 0, avg: 0, stddev: 0 };
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const variance =
    values.reduce((acc, x) => acc + (x - avg) * (x - avg), 0) / n;
  return {
    runs: n,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(avg),
    stddev: Math.round(Math.sqrt(variance)),
  };
}
//#endregion

//#region CTS query (same as optic-sorted.js)
const ctsQuery = cts.andQuery(
  cts.fieldValueQuery(
    'itemMemberOfId',
    'https://lux.collections.yale.edu/data/set/a09304e9-0b15-46e8-a465-0d0d14047b20',
    [
      'case-sensitive',
      'diacritic-sensitive',
      'punctuation-sensitive',
      'whitespace-sensitive',
      'unstemmed',
      'unwildcarded',
      'lang=en',
    ],
    1,
  ),
  null,
);
//#endregion

//#region Plan definition
const selectedPlan = op
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
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  // No Opt 1: use fromSearch + joinInner instead of plan.where(cts)
  .joinInner(
    op.fromSearch(ctsQuery, null, null, { scoreMethod: 'zero' }),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  )
  // LEFT OUTER JOIN for sort lexicon — preserves results without sort values
  .joinLeftOuter(
    op.fromLexicons(
      {
        sort_itemArchiveSortId: cts.fieldReference('itemArchiveSortId', [
          'type=string',
          'collation=http://marklogic.com/collation/codepoint',
        ]),
      },
      null,
      op.fragmentIdCol('sortFrag'),
    ),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('sortFrag')),
  )
  .groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      op.sample('sort_itemArchiveSortId', op.col('sort_itemArchiveSortId')),
    ],
  )
  // MarkLogic sorts nulls LAST in both ASC and DESC (no flag needed).
  .orderBy([
    sortDirection === 'descending'
      ? op.desc('sort_itemArchiveSortId')
      : op.asc('sort_itemArchiveSortId'),
  ])
  .select([
    op.as('id', op.col('uri')),
    op.as('type', op.col('dataType')),
    'sort_itemArchiveSortId',
  ]);
//#endregion

//#region Execute and measure
function runOne() {
  const marks = {};
  const phase = (name, fn) => {
    const t0 = new Date();
    const value = fn();
    marks[name] = new Date() - t0;
    return value;
  };

  const firstPage = phase('firstPageMs', () =>
    selectedPlan.offset(offset).limit(limit).result().toArray(),
  );

  const totalRows = phase('totalCountMs', () =>
    fn.count(selectedPlan.result()),
  );

  return {
    marks,
    totalMs: Object.values(marks).reduce((a, b) => a + b, 0),
    totalRows: Number(totalRows),
    firstPage,
  };
}

const runResults = [];
for (let i = 0; i < runs; i++) {
  runResults.push(runOne());
}

const latest = runResults[runResults.length - 1];

const results = {
  variant: 'variant-1-no-opt1',
  description:
    'No Opt 1 (fromSearch+joinInner instead of plan.where). Sort lexicon via joinLeftOuter. Nulls sort last natively.',
  sortDirection,
  runs,
  totalsMs: stats(runResults.map((r) => r.totalMs)),
  phasesMs: {
    firstPageMs: stats(runResults.map((r) => r.marks.firstPageMs)),
    totalCountMs: stats(runResults.map((r) => r.marks.totalCountMs)),
  },
  totalRows: latest.totalRows,
  firstPageCount: latest.firstPage.length,
  firstPageSample: latest.firstPage.slice(0, 5),
  lastItems:
    latest.firstPage.length === limit
      ? 'use larger offset to verify nulls-last'
      : undefined,
};

export default results;
//#endregion
