/*
 * This script looks for dead-end triples, which are triples that point to documents
 * the user cannot access.
 *
 * Prerequisite: Subject and object IRIs are also document URIs.
 *
 * Script configuration / variables:
 *
 * 1. timeoutInSeconds: Depending on the number of triples being processed, this script
 *    can take a while to complete, such as 30 seconds or even minutes.  If not willing
 *    to wait that long, specify the maximum duration you are willing to wait, up to the
 *    app server's maximum timeout.  When the request times out due to this setting, it
 *    is possible to receive a misleading error, such "JS-BAD: .toArray() -- Unexpected
 *    failure: checkMaybeLocal wrapValue valObj".
 * 2. dataSliceUsernames: set to an array of usernames that you would like the dead-end
 *    triples of.
 * 3. luxUsername: set to a username that has access to all documents.  When
 *    objectDocMustBeInDataset is true, this user is used to weed out object IRIs that
 *    point to documents which are not in the dataset --technically also dead-end triples
 *    but not necessarily the ones you may want.
 * 4. objectDocMustBeInDataset: see luxUsername.
 * 5. deadEndSampleSize: specify request the first n related document URIs the user cannot
 *    access plus source document URIs that define some of the dead-end triples.
 * 6. randomize: set to true to vary the object sample docs between runs.
 * 7. restrictDeadEndSourceDocs: set to true to limit the source document sampling to those
 *    that define the dead-end related document sampling.  When true, you're likely to get
 *    fewer dead-end source documents but you can open one and find one or more of the
 *    dead-end triples, including the predicate.
 * 8. sourceDocsQuery: use to limit which source documents are checked.
 * 9. predicates: use to limit which triples are checked.
 *
 * Data returned by user:
 *
 * 1. sourceDocsEstimate: estimate of sourceDocsQuery.
 * 2. objectUriCount: number of unique object IRIs / URIs from the triples defined in the
 *    source documents.
 * 3. objectDocMustBeInDataset: A configuration variable, repeated here.  When true, the
 *    object IRIs in play are only those that are also documents URIs in the dataset.
 *    Check is performed using the user identified by luxUsername.
 * 4. deadEndCount: number of object URIs that the current user is unable to access, and
 *    thus any triples with matching object IRIs are dead-ends to the current user.
 * 5. deadEndSamplings: object with the following properties.
 *    5a. objectDocs: URIs of dead-end object documents/triples the user cannot access,
 *        up to deadEndSampleSize.
 *    5b. sourceDocs: URIs of the documents defining dead-end triples, up to deadEndSampleSize.
 *        When restrictDeadEndSourceDocs is true, these documents are limited to those defining
 *        triples with object IRIs that match the sample object document URIs.
 *    5c. sourcePredicates: just the predicates of the dead-end triples defined in the source
 *        document sampling.
 *    5d. sourceTriples: the entire dead-end triples defined in the source document sampling.
 *        Not restricted to deadEndSampleSize.
 */
const op = require('/MarkLogic/optic');
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

// BEGIN: Script configuration
const timeoutInSeconds = 120;
const dataSliceUsernames = ['ycba-endpoint-consumer', 'yuag-endpoint-consumer'];
const luxUsername = 'lux-endpoint-consumer';
const objectDocMustBeInDataset = true;
const deadEndSampleSize = 10;
const randomize = true;
const restrictDeadEndSourceDocs = true;
const sourceDocsQuery = cts.andQuery([
  cts.collectionQuery('ycba'),
  cts.collectionQuery('yuag'),
]);
const predicates = [
  crm('P107i_is_current_or_former_member_of'),
  crm('P128_carries'),
  crm('P129_is_about'),
  crm('P138_represents'),
  crm('P16_used_specific_object'),
  crm('P2_has_type'),
  crm('P45_consists_of'),
  crm('P65_shows_visual_item'),
  crm('P89_falls_within'),
  skos('broader'),
  la('equivalent'),
  la('member_of'),
  lux('about_agent'),
  lux('about_concept'),
  lux('about_or_depicts'),
  lux('about_or_depicts_agent'),
  lux('about_or_depicts_concept'),
  lux('about_or_depicts_place'),
  lux('about_place'),
  lux('agentAny'),
  lux('agentClassifiedAs'),
  lux('agentGender'),
  lux('agentNationality'),
  lux('agentOccupation'),
  lux('agentOfBeginning'),
  lux('agentOfCreation'),
  lux('agentOfCuration'),
  lux('agentOfProduction'),
  lux('agentOfPublication'),
  lux('any'),
  lux('carries_or_shows'),
  lux('conceptAny'),
  lux('conceptClassifiedAs'),
  lux('depicts_agent'),
  lux('depicts_concept'),
  lux('depicts_place'),
  lux('eventAny'),
  lux('eventCarriedOutBy'),
  lux('eventClassifiedAs'),
  lux('eventTookPlaceAt'),
  lux('itemAny'),
  lux('itemClassifiedAs'),
  lux('otherAny'),
  lux('otherClassifiedAs'),
  lux('placeAny'),
  lux('placeClassifiedAs'),
  lux('placeOfActivity'),
  lux('placeOfBeginning'),
  lux('placeOfEncounter'),
  lux('placeOfEnding'),
  lux('placeOfProduction'),
  lux('referenceAny'),
  lux('referenceClassifiedAs'),
  lux('setAny'),
  lux('techniqueOfProduction'),
  lux('workAny'),
  lux('workClassifiedAs'),
];
// END: Script configuration

if (Number.isInteger(timeoutInSeconds) && timeoutInSeconds > 0) {
  xdmp.setRequestTimeLimit(timeoutInSeconds);
}

const getAccessibleObjectIris = () => {
  let accessibleObjectIris = cts
    .triples([], predicates, [], null, null, sourceDocsQuery)
    .toArray()
    .map((triple) => {
      return triple.toObject().triple.object;
    });
  // Must de-dup
  return [...new Set(accessibleObjectIris)];
};

const convertToExistingDocUris = (accessibleObjectIris) => {
  return cts
    .uris('', [], cts.documentQuery(accessibleObjectIris))
    .toArray()
    .map((uri) => {
      return uri + ''; // string conversion req'd here
    });
};

const getSourceDocSampling = (objectIris, sampleSize) => {
  return fn
    .subsequence(
      cts.uris(
        '',
        [],
        cts.andQuery([
          sourceDocsQuery,
          cts.jsonPropertyValueQuery('object', objectIris, 'exact'),
        ])
      ),
      1,
      sampleSize
    )
    .toArray();
};

const getArrayDiff = (arr1, arr2) => {
  const onlyInArr1 = arr1.filter((item) => {
    return !arr2.includes(item);
  });
  const onlyInArr2 = arr2.filter((item) => {
    return !arr1.includes(item);
  });
  return {
    onlyInArr1,
    onlyInArr2,
  };
};

const excludeDoesNotExist = (uris) => {
  return uris.filter((uri) => {
    return fn.docAvailable(uri);
  });
};

const findingsByUser = {};
dataSliceUsernames.forEach((username) => {
  const accessibleObjectIris = xdmp
    .invokeFunction(getAccessibleObjectIris, { userId: xdmp.user(username) })
    .toArray()[0];
  const objectUris = xdmp
    .invokeFunction(
      () => {
        return convertToExistingDocUris(accessibleObjectIris);
      },
      { userId: xdmp.user(username) }
    )
    .toArray()[0];
  const diffs = getArrayDiff(accessibleObjectIris, objectUris);
  const deadEndUris = objectDocMustBeInDataset
    ? xdmp
        .invokeFunction(
          () => {
            return excludeDoesNotExist(diffs.onlyInArr1);
          },
          { userId: xdmp.user(luxUsername) }
        )
        .toArray()[0]
    : diffs.onlyInArr1;

  const start =
    randomize && deadEndUris.length > deadEndSampleSize
      ? xdmp.random(deadEndUris.length - deadEndSampleSize)
      : 0;
  const end = start + deadEndSampleSize;
  const deadEndUriSampling = deadEndUris.slice(start, end);

  let deadEndSourceDocUriSampling = 'none';
  let deadEndTripleSampling = 'none';
  let deadEndPredicateSampling = 'none';
  if (deadEndUriSampling.length > 0) {
    deadEndSourceDocUriSampling = xdmp
      .invokeFunction(
        () => {
          return getSourceDocSampling(
            restrictDeadEndSourceDocs ? deadEndUriSampling : deadEndUris,
            deadEndSampleSize
          );
        },
        { userId: xdmp.user(username) }
      )
      .toArray()[0];

    // Now we have the source docs and object IRIs.  When the source docs
    // are limited to the object IRIs, let's get the entire triples.
    if (restrictDeadEndSourceDocs) {
      deadEndTripleSampling = [];
      const objectIrisStr = `('${deadEndUriSampling.join("', '")}')`;
      const predicateIrisStr = `('${predicates.join("', '")}')`;
      deadEndSourceDocUriSampling.forEach((uri) => {
        deadEndTripleSampling = deadEndTripleSampling.concat(
          cts
            .doc(uri)
            .xpath(
              `/triples/triple[object = ${objectIrisStr} and predicate = ${predicateIrisStr}]`
            )
            .toArray()
        );
      });

      deadEndPredicateSampling = deadEndTripleSampling.map((triple) => {
        return triple.predicate + '';
      });
      deadEndPredicateSampling = [...new Set(deadEndPredicateSampling)].sort();
    }
  }
  findingsByUser[username] = {
    sourceDocsEstimate: cts.estimate(sourceDocsQuery),
    // accessibleObjectIriCount: accessibleObjectIris.length,
    objectUriCount: objectUris.length,
    objectDocMustBeInDataset,
    deadEndCount: deadEndUris.length,
    deadEndSamplings: {
      objectDocs: deadEndUriSampling,
      sourceDocs: deadEndSourceDocUriSampling,
      sourcePredicates: deadEndPredicateSampling,
      sourceTriples: deadEndTripleSampling,
    },
  };
});
findingsByUser;
