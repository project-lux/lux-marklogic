/*
 * Use this script to compare two objects whose property values are integers.
 * This was introduced to help validate a new dataset, specifically by taking
 * the return from checkPredicates.js from two different datasets.  Same for
 * getRangeIndexValueCounts.js.
 */

const previousVersionLabel = '2024-10-19';
const previousVersionData = {
  'http://www.cidoc-crm.org/cidoc-crm/P106i_forms_part_of': 819541,
  'http://www.cidoc-crm.org/cidoc-crm/P107i_is_current_or_former_member_of': 585168,
  'http://www.cidoc-crm.org/cidoc-crm/P16_used_specific_object': 1199,
  'http://www.cidoc-crm.org/cidoc-crm/P45_consists_of': 522015,
  'http://www.cidoc-crm.org/cidoc-crm/P72_has_language': 12035032,
  'http://www.cidoc-crm.org/cidoc-crm/P89_falls_within': 465650,
  'http://www.w3.org/2004/02/skos/core#broader': 318499,
  'https://linked.art/ns/terms/member_of': 17760693,
  'https://lux.collections.yale.edu/ns/about_or_depicts_agent': 1701580,
  'https://lux.collections.yale.edu/ns/about_or_depicts_concept': 9227670,
  'https://lux.collections.yale.edu/ns/about_or_depicts_object': 2980,
  'https://lux.collections.yale.edu/ns/about_or_depicts_place': 257122,
  'https://lux.collections.yale.edu/ns/about_or_depicts_work': 345517,
  'https://lux.collections.yale.edu/ns/activityInfluencedCreation': 476387,
  'https://lux.collections.yale.edu/ns/agentAny': 2018557,
  'https://lux.collections.yale.edu/ns/agentClassifiedAs': 1956611,
  'https://lux.collections.yale.edu/ns/agentGender': 1621133,
  'https://lux.collections.yale.edu/ns/agentInfluencedCreation': 585144,
  'https://lux.collections.yale.edu/ns/agentInfluencedProduction': 23799,
  'https://lux.collections.yale.edu/ns/agentNationality': 1305141,
  'https://lux.collections.yale.edu/ns/agentOccupation': 1061953,
  'https://lux.collections.yale.edu/ns/agentOfBeginning': 14365,
  'https://lux.collections.yale.edu/ns/agentOfCreation': 12352925,
  'https://lux.collections.yale.edu/ns/agentOfCuration': 64,
  'https://lux.collections.yale.edu/ns/agentOfEncounter': 845303,
  'https://lux.collections.yale.edu/ns/agentOfProduction': 248604,
  'https://lux.collections.yale.edu/ns/agentOfPublication': 55931,
  'https://lux.collections.yale.edu/ns/carries_or_shows': 13405347,
  'https://lux.collections.yale.edu/ns/causeOfCreation': 158905,
  'https://lux.collections.yale.edu/ns/conceptAny': 4478173,
  'https://lux.collections.yale.edu/ns/conceptClassifiedAs': 225080,
  'https://lux.collections.yale.edu/ns/conceptInfluencedCreation': 4136065,
  'https://lux.collections.yale.edu/ns/eventAny': 14445,
  'https://lux.collections.yale.edu/ns/eventCarriedOutBy': 1684,
  'https://lux.collections.yale.edu/ns/eventClassifiedAs': 13152,
  'https://lux.collections.yale.edu/ns/eventTookPlaceAt': 1397,
  'https://lux.collections.yale.edu/ns/itemAny': 17545141,
  'https://lux.collections.yale.edu/ns/itemClassifiedAs': 17488080,
  'https://lux.collections.yale.edu/ns/placeAny': 469340,
  'https://lux.collections.yale.edu/ns/placeClassifiedAs': 183570,
  'https://lux.collections.yale.edu/ns/placeInfluencedCreation': 2823595,
  'https://lux.collections.yale.edu/ns/placeOfActivity': 128202,
  'https://lux.collections.yale.edu/ns/placeOfBeginning': 630976,
  'https://lux.collections.yale.edu/ns/placeOfCreation': 424132,
  'https://lux.collections.yale.edu/ns/placeOfEncounter': 1975017,
  'https://lux.collections.yale.edu/ns/placeOfEnding': 276908,
  'https://lux.collections.yale.edu/ns/placeOfProduction': 124880,
  'https://lux.collections.yale.edu/ns/placeOfPublication': 11275364,
  'https://lux.collections.yale.edu/ns/referenceAny': 6978629,
  'https://lux.collections.yale.edu/ns/referenceClassifiedAs': 2378413,
  'https://lux.collections.yale.edu/ns/setAny': 305353,
  'https://lux.collections.yale.edu/ns/setClassifiedAs': 305116,
  'https://lux.collections.yale.edu/ns/techniqueOfProduction': 67737,
  'https://lux.collections.yale.edu/ns/typeOfProfessionalActivity': 318103,
  'https://lux.collections.yale.edu/ns/workAny': 13382329,
  'https://lux.collections.yale.edu/ns/workClassifiedAs': 12790804,
};

const latestVersionLabel = '2024-11-23';
const latestVersionData = {
  'http://www.cidoc-crm.org/cidoc-crm/P106i_forms_part_of': 819540,
  'http://www.cidoc-crm.org/cidoc-crm/P107i_is_current_or_former_member_of': 217835,
  'http://www.cidoc-crm.org/cidoc-crm/P16_used_specific_object': 1199,
  'http://www.cidoc-crm.org/cidoc-crm/P45_consists_of': 522730,
  'http://www.cidoc-crm.org/cidoc-crm/P72_has_language': 12035026,
  'http://www.cidoc-crm.org/cidoc-crm/P89_falls_within': 427201,
  'http://www.w3.org/2004/02/skos/core#broader': 251002,
  'https://linked.art/ns/terms/member_of': 17766333,
  'https://lux.collections.yale.edu/ns/about_or_depicts_agent': 1646541,
  'https://lux.collections.yale.edu/ns/about_or_depicts_concept': 9152694,
  'https://lux.collections.yale.edu/ns/about_or_depicts_item': 2977,
  'https://lux.collections.yale.edu/ns/about_or_depicts_place': 227684,
  'https://lux.collections.yale.edu/ns/about_or_depicts_work': 343317,
  'https://lux.collections.yale.edu/ns/agentAny': 676822,
  'https://lux.collections.yale.edu/ns/agentClassifiedAs': 653855,
  'https://lux.collections.yale.edu/ns/agentGender': 539984,
  'https://lux.collections.yale.edu/ns/agentInfluencedCreation': 586271,
  'https://lux.collections.yale.edu/ns/agentInfluencedProduction': 23775,
  'https://lux.collections.yale.edu/ns/agentNationality': 468624,
  'https://lux.collections.yale.edu/ns/agentOccupation': 386863,
  'https://lux.collections.yale.edu/ns/agentOfBeginning': 9010,
  'https://lux.collections.yale.edu/ns/agentOfCreation': 12299979,
  'https://lux.collections.yale.edu/ns/agentOfCuration': 64,
  'https://lux.collections.yale.edu/ns/agentOfEncounter': 849154,
  'https://lux.collections.yale.edu/ns/agentOfProduction': 248922,
  'https://lux.collections.yale.edu/ns/agentOfPublication': 54219,
  'https://lux.collections.yale.edu/ns/carries_or_shows': 13406012,
  'https://lux.collections.yale.edu/ns/causeOfCreation': 158430,
  'https://lux.collections.yale.edu/ns/conceptAny': 4419685,
  'https://lux.collections.yale.edu/ns/conceptClassifiedAs': 220513,
  'https://lux.collections.yale.edu/ns/conceptInfluencedCreation': 4134613,
  'https://lux.collections.yale.edu/ns/eventAny': 14146,
  'https://lux.collections.yale.edu/ns/eventCarriedOutBy': 1577,
  'https://lux.collections.yale.edu/ns/eventClassifiedAs': 13151,
  'https://lux.collections.yale.edu/ns/eventInfluencedCreation': 476769,
  'https://lux.collections.yale.edu/ns/eventTookPlaceAt': 1323,
  'https://lux.collections.yale.edu/ns/itemAny': 17550781,
  'https://lux.collections.yale.edu/ns/itemClassifiedAs': 17493720,
  'https://lux.collections.yale.edu/ns/placeAny': 431229,
  'https://lux.collections.yale.edu/ns/placeClassifiedAs': 183011,
  'https://lux.collections.yale.edu/ns/placeInfluencedCreation': 2822732,
  'https://lux.collections.yale.edu/ns/placeOfActivity': 53368,
  'https://lux.collections.yale.edu/ns/placeOfBeginning': 231439,
  'https://lux.collections.yale.edu/ns/placeOfCreation': 395571,
  'https://lux.collections.yale.edu/ns/placeOfEncounter': 1979509,
  'https://lux.collections.yale.edu/ns/placeOfEnding': 91511,
  'https://lux.collections.yale.edu/ns/placeOfProduction': 125545,
  'https://lux.collections.yale.edu/ns/placeOfPublication': 11275337,
  'https://lux.collections.yale.edu/ns/referenceAny': 5540006,
  'https://lux.collections.yale.edu/ns/referenceClassifiedAs': 1070530,
  'https://lux.collections.yale.edu/ns/setAny': 305353,
  'https://lux.collections.yale.edu/ns/setClassifiedAs': 305116,
  'https://lux.collections.yale.edu/ns/techniqueOfProduction': 67740,
  'https://lux.collections.yale.edu/ns/typeOfProfessionalActivity': 92947,
  'https://lux.collections.yale.edu/ns/workAny': 13245420,
  'https://lux.collections.yale.edu/ns/workClassifiedAs': 12726639,
};

const allPredicates = Object.keys(previousVersionData).concat(
  Object.keys(latestVersionData)
);

const diffs = {
  note: `Counts from ${latestVersionLabel} less those from ${previousVersionLabel}`,
};
allPredicates.forEach((predicate) => {
  const previousCount = previousVersionData[predicate]
    ? previousVersionData[predicate]
    : 0;
  const latestCount = latestVersionData[predicate]
    ? latestVersionData[predicate]
    : 0;
  diffs[predicate] = latestCount - previousCount;
});

diffs;
export default diffs;
