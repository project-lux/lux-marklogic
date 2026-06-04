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
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  .joinInner(
    op
      .fromTriples([
        op.pattern(
          op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_s'),
          [sem.iri('https://linked.art/ns/terms/member_of')],
          op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_o'),
          op.fragmentIdCol('b03e8eac_13f1_4adb_944c_03a0895212e7_hopFrag'),
        ),
      ])
      .joinInner(
        op
          .fromLexicons(
            {
              b03e8eac_13f1_4adb_944c_03a0895212e7_uri: cts.uriReference(),
              b03e8eac_13f1_4adb_944c_03a0895212e7_iri: cts.iriReference(),
              b03e8eac_13f1_4adb_944c_03a0895212e7_dataType: cts.fieldReference(
                'anyDataTypeName',
                [
                  'type=string',
                  'collation=http://marklogic.com/collation/codepoint',
                ],
              ),
            },
            null,
            op.fragmentIdCol('b03e8eac_13f1_4adb_944c_03a0895212e7_frag'),
          )
          .where(
            op.in(op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_dataType'), [
              'Set',
            ]),
          )
          .where(
            cts.andQuery(
              cts.tripleRangeQuery(
                null,
                sem.iri('https://lux.collections.yale.edu/ns/setClassifiedAs'),
                [
                  sem.iri('/does/not/exist'),
                  sem.iri(
                    'https://lux.collections.yale.edu/data/concept/dd625870-8775-44b2-9c19-b6281462c684',
                  ),
                ],
                ['=', '=', '='],
                null,
                1,
              ),
              null,
            ),
          )
          .joinInner(
            op
              .fromTriples([
                op.pattern(
                  op.col('fe9df227_f86d_40cf_81d1_e24243290e80_s'),
                  [sem.iri('https://linked.art/ns/terms/member_of')],
                  op.col('fe9df227_f86d_40cf_81d1_e24243290e80_o'),
                  op.fragmentIdCol(
                    'fe9df227_f86d_40cf_81d1_e24243290e80_triFrag',
                  ),
                ),
              ])
              .joinInner(
                op
                  .fromLexicons(
                    {
                      fe9df227_f86d_40cf_81d1_e24243290e80_uri:
                        cts.uriReference(),
                      fe9df227_f86d_40cf_81d1_e24243290e80_iri:
                        cts.iriReference(),
                      fe9df227_f86d_40cf_81d1_e24243290e80_dataType:
                        cts.fieldReference('anyDataTypeName', [
                          'type=string',
                          'collation=http://marklogic.com/collation/codepoint',
                        ]),
                    },
                    null,
                    op.fragmentIdCol(
                      'fe9df227_f86d_40cf_81d1_e24243290e80_frag',
                    ),
                  )
                  .where(
                    op.in(
                      op.col('fe9df227_f86d_40cf_81d1_e24243290e80_dataType'),
                      ['Set'],
                    ),
                  )
                  .where(
                    op.eq(
                      op.col('fe9df227_f86d_40cf_81d1_e24243290e80_uri'),
                      'https://lux.collections.yale.edu/data/set/1dc7ad5a-6fe3-4ce5-a599-ca5e5742876d',
                    ),
                  ),
                [
                  op.on(
                    op.fragmentIdCol(
                      'fe9df227_f86d_40cf_81d1_e24243290e80_triFrag',
                    ),
                    op.fragmentIdCol(
                      'fe9df227_f86d_40cf_81d1_e24243290e80_frag',
                    ),
                  ),
                ],
              ),
            op.on(
              op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_iri'),
              op.col('fe9df227_f86d_40cf_81d1_e24243290e80_o'),
            ),
          ),
        op.on(
          op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_o'),
          op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_iri'),
        ),
      ),
    [
      op.on(op.col('iri'), op.col('b03e8eac_13f1_4adb_944c_03a0895212e7_s')),
      op.on(
        op.fragmentIdCol('frag'),
        op.fragmentIdCol('b03e8eac_13f1_4adb_944c_03a0895212e7_hopFrag'),
      ),
    ],
  )
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const offset = 0;
const limit = 20;
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
