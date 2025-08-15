const op = require('/MarkLogic/optic');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

const runGeneratedUriPlan = false;
const predicate = lux('any');
const wordTerm = 'gardener';
const wordQueryOptions = [
  'case-insensitive',
  'diacritic-insensitive',
  'punctuation-insensitive',
  'whitespace-sensitive',
  'stemmed',
  'wildcarded',
];

const manualIriColumnName = 'iri_reference';
const manualIriPlan = op
  .fromSearch(cts.fieldWordQuery('anyPrimaryName', wordTerm, wordQueryOptions))
  .joinInner(
    op.fromLexicons(
      { iri_reference: cts.iriReference() },
      null,
      op.fragmentIdCol('lexiconFragmentID')
    ),
    op.on('fragmentID', 'lexiconFragmentID')
  )
  .intersect(
    op.fromTriples(
      op.pattern(op.col('iri_source'), predicate, op.col('iri_reference'))
    )
  );

const generatedIriColumnName = 'external2';
const generatedIriPlan = op
  .fromSearch(
    cts.fieldWordQuery(['anyPrimaryName'], 'gardener', [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-sensitive',
      'stemmed',
      'wildcarded',
    ]),
    [op.as('fragmentId2', op.col('fragmentId'))],
    'fromSearch2'
  )
  .joinInner(
    op.fromLexicons(
      { external2: cts.iriReference() },
      null,
      op.fragmentIdCol('lexiconFragmentId')
    ),
    [op.on('fragmentId2', 'lexiconFragmentId')]
  )
  .intersect(
    op.fromTriples(
      op.pattern(op.col('not_external2'), predicate, op.col('external2')) // opposite of generatedUriPlan
    )
  );

const generatedUriColumnName = 'external2';
const generatedUriPlan = op
  .fromSearch(
    cts.andQuery([
      cts.fieldWordQuery(['anyPrimaryName'], 'gardener', [
        'case-insensitive',
        'diacritic-insensitive',
        'punctuation-insensitive',
        'whitespace-sensitive',
        'stemmed',
        'wildcarded',
      ]),
    ]),
    [op.as('fragmentId2', op.col('fragmentId'))],
    'fromSearch2'
  )
  .joinDocUri('uri2', op.fragmentIdCol('fragmentId2'))
  .joinInner(
    op.fromTriples(
      op.pattern(op.col('external2'), predicate, op.col('not_external2'))
    )
  )
  .where(op.eq(op.col('external2'), op.sem.iri(op.col('uri2'))));

const manualIriPlanResults = Array.from(
  manualIriPlan
    .offset(0)
    .limit(10)
    .select([op.col(manualIriColumnName)])
    .map((row) => {
      return { uri: row[manualIriColumnName] };
    })
    .result(null, null, null)
);

const generatedIriPlanResults = Array.from(
  generatedIriPlan
    .offset(0)
    .limit(10)
    .select([op.col(generatedIriColumnName)])
    .map((row) => {
      return { uri: row[generatedIriColumnName] };
    })
    .result(null, null, null)
);

const generatedUriPlanResults = runGeneratedUriPlan
  ? Array.from(
      generatedUriPlan
        .offset(0)
        .limit(10)
        .select([op.col(generatedUriColumnName)])
        .map((row) => {
          return { uri: row[generatedUriColumnName] };
        })
        .result(null, null, null)
    )
  : null;

const blendedResults = [];
for (let i = 0; i < manualIriPlanResults.length; i++) {
  blendedResults.push({
    ___manual_iri: manualIriPlanResults[i].uri,
    generated_iri:
      generatedIriPlanResults.length > i
        ? generatedIriPlanResults[i].uri
        : 'No result from the generated IRI query',
    generated_uri: runGeneratedUriPlan
      ? generatedUriPlanResults.length > i
        ? generatedUriPlanResults[i].uri
        : 'No result from the generated URI query'
      : 'Generated URI plan not executed',
  });
}

blendedResults;
export default blendedResults;
