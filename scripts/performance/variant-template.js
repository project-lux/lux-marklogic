'use strict';

// This template may be used to gather metrics on an optimization idea. This is a preliminary
// step to validate or invalidate an approach. Typically, such variants are created and tested
// while collaborating with an LLM and those demonstrating potential are then further vetted,
// starting with /scripts/performance/benchmark-template-optic.js. See the "LLM Kickoff"
// section in /docs/lux-optic-primer.md for more details.
//
// LLM instructions (read before generating a variant):
// - Keep edits minimal and local. Change only the lines needed to test one idea.
// - Prefer clarity over abstraction. Do not introduce helper layers just to be DRY.
// - Keep script shape close to the starting Optic plan so developers can diff quickly.
// - Return only the first page (20 rows) and include scenario + elapsed time.
// - Do not add total-count logic at this stage (no cts.estimate / full-count probes).
// - The variantPlan below is a placeholder and is likely unrelated to your issue.
//   Replace the entire variantPlan with your idea, then keep the rows execution
//   block unchanged unless your optimization is specifically about pagination or execution.
// - If your goal is discovery (collecting more information before proposing variants),
//   create a separate discovery script instead of forcing this template.

import op from 'MarkLogic/optic.mjs';
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

//#region Configuration

const scenario = 'Lexicon sort using joinLeftOuter';
const offset = 0;
const limit = 20;

//#endregion Configuration

//#region Variant Logic

const variantPlan = op
  .fromLexicons(
    {
      uri: cts.uriReference(),
      iri: cts.iriReference(),
      dataType: cts.fieldReference('anyDataTypeName', [
        'type=string',
        'collation=http://marklogic.com/collation/codepoint',
      ]),
      // Moved itemArchiveSortId after where clauses.
    },
    null,
    op.fragmentIdCol('frag'),
  )
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  .where(
    cts.andQuery(
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
    ),
  )
  // Join left outer will not drop rows that do not have a value for itemArchiveSortId.
  .joinLeftOuter(
    op.fromLexicons(
      {
        sort_itemArchiveSortId: cts.fieldReference('itemArchiveSortId', [
          'type=string',
          'collation=http://marklogic.com/collation/codepoint',
        ]),
      },
      null,
      op.fragmentIdCol('sortFrag0'),
    ),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('sortFrag0')),
  )
  .groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      op.min('sort_itemArchiveSortId', op.col('sort_itemArchiveSortId')),
    ],
  )
  .orderBy([op.asc('sort_itemArchiveSortId')])
  .select([
    op.as('id', op.col('uri')),
    op.as('type', op.col('dataType')),
    'sort_itemArchiveSortId',
  ]);

const rows = variantPlan.offset(offset).limit(limit).result().toArray();

//#endregion Variant Logic

const results = {
  scenario,
  elapsedTime: String(xdmp.elapsedTime()),
  offset,
  limit,
  paginatedRowCount: rows.length,
  rows,
};

export default results;
