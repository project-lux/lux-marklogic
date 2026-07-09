import op from 'MarkLogic/optic.mjs';

// Variant 3: Opt 20 style — fromSearch as driving plan, no fromLexicons for base.
// Sort lexicon joined via joinLeftOuter on fragmentId. Paginates BEFORE hydrating
// (joinDocAndUri) so only the page slice hits disk. Eliminates the 43.9M-entry
// iri lexicon scan and dedup groupBy entirely.
//
// Trade-off: requires joinDocAndUri to extract the dataType from the document
// (same as Opt 20's isFromSearchPlan path in performSearch), but avoids the
// expensive base lexicon scan.
//
// TODO: multi-value lexicons — if a document can have multiple values in the sort
// lexicon, the left outer join may produce multiple rows per fragment. Address
// after locking onto an approach.

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

//#region Scoped CTS query (includes scope filter for fromSearch)
const scopedCtsQuery = cts.andQuery([
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
  cts.fieldValueQuery('anyDataTypeName', ['DigitalObject', 'HumanMadeObject']),
]);
//#endregion

//#region Plan definition
// Base: fromSearch gives us fragmentId for all matching docs (no lexicon scan).
// Then LEFT OUTER join sort lexicon, sort with nulls-last, paginate, hydrate.
const sortedPlan = op
  .fromSearch(scopedCtsQuery, ['fragmentId'], null, { scoreMethod: 'zero' })
  // LEFT OUTER JOIN sort lexicon — preserves results without sort values
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
    op.on(op.fragmentIdCol('fragmentId'), op.fragmentIdCol('sortFrag')),
  )
  // MarkLogic sorts nulls LAST in both ASC and DESC (no flag needed).
  .orderBy([
    sortDirection === 'descending'
      ? op.desc('sort_itemArchiveSortId')
      : op.asc('sort_itemArchiveSortId'),
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

  // First page: paginate then hydrate (Opt 20 pattern).
  // joinDocAndUri pulls documents only for the page slice.
  const firstPage = phase('firstPageMs', () =>
    sortedPlan
      .offset(offset)
      .limit(limit)
      .joinDocAndUri('doc', 'uri', op.fragmentIdCol('fragmentId'))
      .result()
      .toArray()
      .map((row) => ({
        id: row.uri,
        type: String(row.doc.xpath('/json/type')),
        sort_itemArchiveSortId: row.sort_itemArchiveSortId ?? null,
      })),
  );

  // Total count via cts.estimate (no plan execution needed — same as Opt 18).
  const totalRows = phase('totalCountMs', () =>
    Number(cts.estimate(scopedCtsQuery)),
  );

  return {
    marks,
    totalMs: Object.values(marks).reduce((a, b) => a + b, 0),
    totalRows,
    firstPage,
  };
}

const runResults = [];
for (let i = 0; i < runs; i++) {
  runResults.push(runOne());
}

const latest = runResults[runResults.length - 1];

const results = {
  variant: 'variant-3-from-search-sort',
  description:
    'Opt 20 style: fromSearch as base (no fromLexicons). Sort lexicon via joinLeftOuter on fragmentId. Paginate first, then hydrate page slice via joinDocAndUri. Total via cts.estimate.',
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
