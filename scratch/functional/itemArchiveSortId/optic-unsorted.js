import op from 'MarkLogic/optic.mjs';

const selectedPlan = op
  .fromLexicons(
    {
      uri: cts.uriReference(),
      iri: cts.iriReference(),
      dataType: cts.fieldReference('anyDataTypeName', [
        'type=string',
        'collation=http://marklogic.com/collation/codepoint',
      ]),
      // sort_itemArchiveSortId: cts.fieldReference('itemArchiveSortId', [
      //   'type=string',
      //   'collation=http://marklogic.com/collation/codepoint',
      // ]),
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
  // .groupBy(
  //   ['uri'],
  //   [op.sample('dataType', op.col('dataType')), 'sort_itemArchiveSortId'],
  // )
  // .orderBy([op.asc('sort_itemArchiveSortId')])
  .select([
    op.as('id', op.col('uri')),
    op.as('type', op.col('dataType')),
    // 'sort_itemArchiveSortId',
  ]);

const offset = 0;
const limit = 20;
const results = selectedPlan.result().toArray().length;
export default results;
