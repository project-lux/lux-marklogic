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
    },
    null,
    op.fragmentIdCol('frag'),
  )
  .where(op.in(op.col('dataType'), ['Activity', 'Period']))
  .joinInner(
    op
      .fromTriples([
        op.pattern(
          op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_s'),
          [
            sem.iri(
              'http://www.cidoc-crm.org/cidoc-crm/P16_used_specific_object',
            ),
          ],
          op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_o'),
          op.fragmentIdCol('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_hopFrag'),
        ),
      ])
      .joinInner(
        op
          .fromLexicons(
            {
              '8e2442e7_cbc6_460d_aaf1_a90ea0e270da_uri': cts.uriReference(),
              '8e2442e7_cbc6_460d_aaf1_a90ea0e270da_iri': cts.iriReference(),
              '8e2442e7_cbc6_460d_aaf1_a90ea0e270da_dataType':
                cts.fieldReference('anyDataTypeName', [
                  'type=string',
                  'collation=http://marklogic.com/collation/codepoint',
                ]),
            },
            null,
            op.fragmentIdCol('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_frag'),
          )
          .where(
            op.in(op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_dataType'), [
              'Set',
            ]),
          )
          .joinInner(
            op
              .fromTriples([
                op.pattern(
                  op.col('dca6a2d9_ebf1_4801_8211_11d2b1272005_s'),
                  [sem.iri('https://linked.art/ns/terms/member_of')],
                  op.col('dca6a2d9_ebf1_4801_8211_11d2b1272005_o'),
                  op.fragmentIdCol(
                    'dca6a2d9_ebf1_4801_8211_11d2b1272005_triFrag',
                  ),
                ),
              ])
              .joinInner(
                op
                  .fromLexicons(
                    {
                      dca6a2d9_ebf1_4801_8211_11d2b1272005_uri:
                        cts.uriReference(),
                      dca6a2d9_ebf1_4801_8211_11d2b1272005_iri:
                        cts.iriReference(),
                      dca6a2d9_ebf1_4801_8211_11d2b1272005_dataType:
                        cts.fieldReference('anyDataTypeName', [
                          'type=string',
                          'collation=http://marklogic.com/collation/codepoint',
                        ]),
                    },
                    null,
                    op.fragmentIdCol(
                      'dca6a2d9_ebf1_4801_8211_11d2b1272005_frag',
                    ),
                  )
                  .where(
                    op.in(
                      op.col('dca6a2d9_ebf1_4801_8211_11d2b1272005_dataType'),
                      ['DigitalObject', 'HumanMadeObject'],
                    ),
                  )
                  .where(
                    cts.andQuery(
                      cts.fieldValueQuery(
                        'itemProductionAgentId',
                        'https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1',
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
                  ),
                [
                  op.on(
                    op.fragmentIdCol(
                      'dca6a2d9_ebf1_4801_8211_11d2b1272005_triFrag',
                    ),
                    op.fragmentIdCol(
                      'dca6a2d9_ebf1_4801_8211_11d2b1272005_frag',
                    ),
                  ),
                ],
              ),
            op.on(
              op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_iri'),
              op.col('dca6a2d9_ebf1_4801_8211_11d2b1272005_o'),
            ),
          ),
        op.on(
          op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_o'),
          op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_iri'),
        ),
      ),
    [
      op.on(op.col('iri'), op.col('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_s')),
      op.on(
        op.fragmentIdCol('frag'),
        op.fragmentIdCol('8e2442e7_cbc6_460d_aaf1_a90ea0e270da_hopFrag'),
      ),
    ],
  )
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const offset = 0;
const limit = 20;
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
