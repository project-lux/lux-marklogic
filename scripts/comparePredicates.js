/*
 * This script compares all predicates in the dataset to those configured by the backend
 * in order to surface a) configured predicates that do not exist and b) predicates that
 * exist but are not configured.  One of two arrays is calculated herein.  The other needs
 * to be manually supplied using checkPredicates.js.
 */
'use strict';

const dedup = true;

// All predicates
// The following query takes between 15 and 45 seconds.
const op = require('/MarkLogic/optic');
const s = op.col('s');
const p = op.col('p');
const o = op.col('o');
let allPredicates = op
  .fromTriples(op.pattern(s, p, o))
  .groupBy(p)
  .result()
  .toArray()
  .map((row) => {
    return row.p + '';
  })
  .sort();
// Already de-dup'd
// if (dedup) {
//   allPredicates = [...new Set(allPredicates)];
// }

// Configured predicates.
//
// The following list was compiled from the 2024-10-19 dataset using checkPredicates.js
// configured as such:
//
// const usernames = ['admin'];
// const includeCurrentUser = false;
// const justZeros = false;
// const formatAsArrayOfPredicates = true;
// let identifyTerms = false;
//
let configuredPredicates = [
  'http://www.cidoc-crm.org/cidoc-crm/P106i_forms_part_of',
  'http://www.cidoc-crm.org/cidoc-crm/P107i_is_current_or_former_member_of',
  'http://www.cidoc-crm.org/cidoc-crm/P16_used_specific_object',
  'http://www.cidoc-crm.org/cidoc-crm/P45_consists_of',
  'http://www.cidoc-crm.org/cidoc-crm/P72_has_language',
  'http://www.cidoc-crm.org/cidoc-crm/P89_falls_within',
  'http://www.w3.org/2004/02/skos/core#broader',
  'https://linked.art/ns/terms/member_of',
  'https://lux.collections.yale.edu/ns/about_or_depicts_agent',
  'https://lux.collections.yale.edu/ns/about_or_depicts_concept',
  'https://lux.collections.yale.edu/ns/about_or_depicts_object',
  'https://lux.collections.yale.edu/ns/about_or_depicts_place',
  'https://lux.collections.yale.edu/ns/about_or_depicts_work',
  'https://lux.collections.yale.edu/ns/activityInfluencedCreation',
  'https://lux.collections.yale.edu/ns/agentAny',
  'https://lux.collections.yale.edu/ns/agentClassifiedAs',
  'https://lux.collections.yale.edu/ns/agentGender',
  'https://lux.collections.yale.edu/ns/agentInfluencedCreation',
  'https://lux.collections.yale.edu/ns/agentInfluencedProduction',
  'https://lux.collections.yale.edu/ns/agentNationality',
  'https://lux.collections.yale.edu/ns/agentOccupation',
  'https://lux.collections.yale.edu/ns/agentOfBeginning',
  'https://lux.collections.yale.edu/ns/agentOfCreation',
  'https://lux.collections.yale.edu/ns/agentOfCuration',
  'https://lux.collections.yale.edu/ns/agentOfEncounter',
  'https://lux.collections.yale.edu/ns/agentOfProduction',
  'https://lux.collections.yale.edu/ns/agentOfPublication',
  'https://lux.collections.yale.edu/ns/carries_or_shows',
  'https://lux.collections.yale.edu/ns/causeOfCreation',
  'https://lux.collections.yale.edu/ns/conceptAny',
  'https://lux.collections.yale.edu/ns/conceptClassifiedAs',
  'https://lux.collections.yale.edu/ns/conceptInfluencedCreation',
  'https://lux.collections.yale.edu/ns/eventAny',
  'https://lux.collections.yale.edu/ns/eventCarriedOutBy',
  'https://lux.collections.yale.edu/ns/eventClassifiedAs',
  'https://lux.collections.yale.edu/ns/eventTookPlaceAt',
  'https://lux.collections.yale.edu/ns/itemAny',
  'https://lux.collections.yale.edu/ns/itemClassifiedAs',
  'https://lux.collections.yale.edu/ns/placeAny',
  'https://lux.collections.yale.edu/ns/placeClassifiedAs',
  'https://lux.collections.yale.edu/ns/placeInfluencedCreation',
  'https://lux.collections.yale.edu/ns/placeOfActivity',
  'https://lux.collections.yale.edu/ns/placeOfBeginning',
  'https://lux.collections.yale.edu/ns/placeOfCreation',
  'https://lux.collections.yale.edu/ns/placeOfEncounter',
  'https://lux.collections.yale.edu/ns/placeOfEnding',
  'https://lux.collections.yale.edu/ns/placeOfProduction',
  'https://lux.collections.yale.edu/ns/placeOfPublication',
  'https://lux.collections.yale.edu/ns/referenceAny',
  'https://lux.collections.yale.edu/ns/referenceClassifiedAs',
  'https://lux.collections.yale.edu/ns/setAny',
  'https://lux.collections.yale.edu/ns/setClassifiedAs',
  'https://lux.collections.yale.edu/ns/techniqueOfProduction',
  'https://lux.collections.yale.edu/ns/typeOfProfessionalActivity',
  'https://lux.collections.yale.edu/ns/workAny',
  'https://lux.collections.yale.edu/ns/workClassifiedAs',
];
if (dedup) {
  configuredPredicates = [...new Set(configuredPredicates)];
}

function getArrayDiff(configuredPredicates, allPredicates) {
  const existsButNotReferenced = allPredicates.filter((item) => {
    return !configuredPredicates.includes(item);
  });
  const referencedButDoesNotExist = configuredPredicates.filter((item) => {
    return !allPredicates.includes(item);
  });
  return {
    referencedButDoesNotExist,
    existsButNotReferenced,
  };
}

getArrayDiff(configuredPredicates, allPredicates);
