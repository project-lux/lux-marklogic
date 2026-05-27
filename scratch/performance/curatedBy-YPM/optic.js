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
          op.col('aaf4709a_732c_418c_bf0a_787eff724637_s'),
          [sem.iri('https://linked.art/ns/terms/member_of')],
          op.col('aaf4709a_732c_418c_bf0a_787eff724637_o'),
          op.fragmentIdCol('aaf4709a_732c_418c_bf0a_787eff724637_hopFrag'),
        ),
      ])
      .joinInner(
        op
          .fromLexicons(
            {
              aaf4709a_732c_418c_bf0a_787eff724637_uri: cts.uriReference(),
              aaf4709a_732c_418c_bf0a_787eff724637_iri: cts.iriReference(),
              aaf4709a_732c_418c_bf0a_787eff724637_dataType: cts.fieldReference(
                'anyDataTypeName',
                [
                  'type=string',
                  'collation=http://marklogic.com/collation/codepoint',
                ],
              ),
            },
            null,
            op.fragmentIdCol('aaf4709a_732c_418c_bf0a_787eff724637_frag'),
          )
          .where(
            op.in(op.col('aaf4709a_732c_418c_bf0a_787eff724637_dataType'), [
              'Set',
            ]),
          )
          .joinInner(
            op.fromTriples([
              op.pattern(
                op.col('5d2ef171_5efe_4e4e_a91d_ef1646a31b05_s'),
                [
                  sem.iri(
                    'https://lux.collections.yale.edu/ns/agentOfCuration',
                  ),
                ],
                sem.iri(
                  'https://lux.collections.yale.edu/data/group/0a5ed086-396b-4cc2-8120-fdc3f8953ce2',
                ),
                op.fragmentIdCol(
                  '5d2ef171_5efe_4e4e_a91d_ef1646a31b05_hopFrag',
                ),
              ),
            ]),
            [
              op.on(
                op.col('aaf4709a_732c_418c_bf0a_787eff724637_iri'),
                op.col('5d2ef171_5efe_4e4e_a91d_ef1646a31b05_s'),
              ),
              op.on(
                op.fragmentIdCol('aaf4709a_732c_418c_bf0a_787eff724637_frag'),
                op.fragmentIdCol(
                  '5d2ef171_5efe_4e4e_a91d_ef1646a31b05_hopFrag',
                ),
              ),
            ],
          ),
        op.on(
          op.col('aaf4709a_732c_418c_bf0a_787eff724637_o'),
          op.col('aaf4709a_732c_418c_bf0a_787eff724637_iri'),
        ),
      ),
    [
      op.on(op.col('iri'), op.col('aaf4709a_732c_418c_bf0a_787eff724637_s')),
      op.on(
        op.fragmentIdCol('frag'),
        op.fragmentIdCol('aaf4709a_732c_418c_bf0a_787eff724637_hopFrag'),
      ),
    ],
  )
  .joinFullOuter(
    op
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
      .joinInner(
        op
          .fromTriples([
            op.pattern(
              op.col('a374b043_c9a9_47a9_966c_ff099996a83c_s'),
              [sem.iri('https://linked.art/ns/terms/member_of')],
              op.col('a374b043_c9a9_47a9_966c_ff099996a83c_o'),
              op.fragmentIdCol('a374b043_c9a9_47a9_966c_ff099996a83c_hopFrag'),
            ),
          ])
          .joinInner(
            op
              .fromLexicons(
                {
                  a374b043_c9a9_47a9_966c_ff099996a83c_uri: cts.uriReference(),
                  a374b043_c9a9_47a9_966c_ff099996a83c_iri: cts.iriReference(),
                  a374b043_c9a9_47a9_966c_ff099996a83c_dataType:
                    cts.fieldReference('anyDataTypeName', [
                      'type=string',
                      'collation=http://marklogic.com/collation/codepoint',
                    ]),
                },
                null,
                op.fragmentIdCol('a374b043_c9a9_47a9_966c_ff099996a83c_frag'),
              )
              .where(
                op.in(op.col('a374b043_c9a9_47a9_966c_ff099996a83c_dataType'), [
                  'Set',
                ]),
              )
              .joinInner(
                op
                  .fromTriples([
                    op.pattern(
                      op.col('fb20bbf1_be96_44c0_91eb_710282ab5709_s'),
                      [
                        sem.iri(
                          'https://lux.collections.yale.edu/ns/agentOfCuration',
                        ),
                      ],
                      op.col('fb20bbf1_be96_44c0_91eb_710282ab5709_o'),
                      op.fragmentIdCol(
                        'fb20bbf1_be96_44c0_91eb_710282ab5709_hopFrag',
                      ),
                    ),
                  ])
                  .joinInner(
                    op
                      .fromLexicons(
                        {
                          fb20bbf1_be96_44c0_91eb_710282ab5709_uri:
                            cts.uriReference(),
                          fb20bbf1_be96_44c0_91eb_710282ab5709_iri:
                            cts.iriReference(),
                          fb20bbf1_be96_44c0_91eb_710282ab5709_dataType:
                            cts.fieldReference('anyDataTypeName', [
                              'type=string',
                              'collation=http://marklogic.com/collation/codepoint',
                            ]),
                        },
                        null,
                        op.fragmentIdCol(
                          'fb20bbf1_be96_44c0_91eb_710282ab5709_frag',
                        ),
                      )
                      .where(
                        op.in(
                          op.col(
                            'fb20bbf1_be96_44c0_91eb_710282ab5709_dataType',
                          ),
                          ['Person', 'Group'],
                        ),
                      )
                      .where(
                        cts.andQuery(
                          cts.fieldValueQuery(
                            'agentMemberOfId',
                            'https://lux.collections.yale.edu/data/group/0a5ed086-396b-4cc2-8120-fdc3f8953ce2',
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
                    op.on(
                      op.col('fb20bbf1_be96_44c0_91eb_710282ab5709_o'),
                      op.col('fb20bbf1_be96_44c0_91eb_710282ab5709_iri'),
                    ),
                  ),
                [
                  op.on(
                    op.col('a374b043_c9a9_47a9_966c_ff099996a83c_iri'),
                    op.col('fb20bbf1_be96_44c0_91eb_710282ab5709_s'),
                  ),
                  op.on(
                    op.fragmentIdCol(
                      'a374b043_c9a9_47a9_966c_ff099996a83c_frag',
                    ),
                    op.fragmentIdCol(
                      'fb20bbf1_be96_44c0_91eb_710282ab5709_hopFrag',
                    ),
                  ),
                ],
              ),
            op.on(
              op.col('a374b043_c9a9_47a9_966c_ff099996a83c_o'),
              op.col('a374b043_c9a9_47a9_966c_ff099996a83c_iri'),
            ),
          ),
        [
          op.on(
            op.col('iri'),
            op.col('a374b043_c9a9_47a9_966c_ff099996a83c_s'),
          ),
          op.on(
            op.fragmentIdCol('frag'),
            op.fragmentIdCol('a374b043_c9a9_47a9_966c_ff099996a83c_hopFrag'),
          ),
        ],
      )
      .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
      .select(['uri', 'frag', 'dataType']),
    null,
  )
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const offset = 0;
const limit = 20;
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
