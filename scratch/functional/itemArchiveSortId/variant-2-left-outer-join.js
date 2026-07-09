import op from 'MarkLogic/optic.mjs';

// Variant 2: Keep Opt 1 (plan.where(cts)) — sort lexicon via joinLeftOuter.
// Inspired by applySemanticSort pattern: base plan filtered first, then LEFT OUTER
// join the sort data. Preserves all results; nulls sort last regardless of direction.
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
  // Opt 1 preserved: CTS query applied via plan.where()
  .where(ctsQuery)
  // LEFT OUTER JOIN sort lexicon (applySemanticSort pattern).
  // Results without sort values get null — preserved by left outer join.
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
  variant: 'variant-2-left-outer-join',
  description:
    'Opt 1 preserved (plan.where). Sort lexicon via joinLeftOuter (applySemanticSort pattern). Nulls sort last natively.',
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
};

export default results;
//#endregion
