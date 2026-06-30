op.fromSearch(
  cts.documentQuery(
    'https://lux.collections.yale.edu/data/object/36e1f8fe-e332-4f70-8ed1-5c35da83d2ad',
  ),
)
  .joinInner(
    op.fromLexicons(
      { iri: cts.iriReference() },
      null,
      op.fragmentIdCol('iriFragId'),
    ),
    op.on('fragmentId', 'iriFragId'),
  )
  .select(['iri'])
  .joinInner(
    op
      .fromSearch(
        cts.andQuery(
          [
            cts.jsonPropertyValueQuery(
              'dataType',
              'Set',
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
            cts.jsonPropertyValueQuery(
              'id',
              'http://vocab.getty.edu/aat/300025976',
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
          ],
          null,
        ),
      )
      .joinInner(
        op.fromLexicons(
          { setIri: cts.iriReference() },
          null,
          op.fragmentIdCol('setFragId'),
        ),
        op.on('fragmentId', 'setFragId'),
      )
      .joinInner(
        op.fromTriples([
          op.pattern(
            op.col('item'),
            sem.iri('https://linked.art/ns/terms/member_of'),
            op.col('set'),
          ),
        ]),
        op.on('setIri', 'set'),
      ),
    op.on('iri', 'item'),
  )
  // TODO: see if this is necessary.
  .orderBy(op.col('set'))
  // TODO: figure out if we want set or item as the value of the `value` property.
  // calculateFacets wants row.value
  // Don't just fix for this facet.  Semantic facets are configurable.
  // Consider op.as('value', op.col('set')) in the join above.
  .groupBy(op.col('set'), op.count('count', 'item'))
  .orderBy(op.desc('count'));
