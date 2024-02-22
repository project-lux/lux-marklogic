import { getIRI } from '../lib/dataConstants.mjs';

const FACETS_VIA_SEARCH_CONFIG = {
  responsibleCollections: {
    getFacetValuesCriteria: (baseSearchCriteria) => {
      // If changing this criteria, do so within responsibleUnits too.
      const criteria = {
        _scope: 'agent',
        curated: {
          containing: null,
        },
      };
      criteria.curated.containing = baseSearchCriteria;
      return criteria;
    },
    getFacetValueCountCriteria: (baseSearchCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              curatedBy: {
                id: null,
              },
            },
          },
        ],
      };
      criteria.AND[0].memberOf.curatedBy.id = facetValueId;
      criteria.AND.push(baseSearchCriteria);
      return criteria;
    },
  },
  responsibleUnits: {
    getFacetValuesCriteria: (baseSearchCriteria) => {
      // Part of this criteria should match that of responsibleCollections.
      const criteria = {
        _scope: 'agent',
        memberOfInverse: {
          AND: [
            {
              curated: {
                containing: null,
              },
            },
            {
              classification: {
                id: getIRI('department'),
              },
            },
          ],
        },
      };
      criteria.memberOfInverse.AND[0].curated.containing = baseSearchCriteria;
      return criteria;
    },
    getFacetValueCountCriteria: (baseSearchCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              curatedBy: {
                AND: [
                  {
                    memberOf: {
                      id: null,
                    },
                  },
                  {
                    classification: {
                      id: getIRI('department'),
                    },
                  },
                ],
              },
            },
          },
        ],
      };
      criteria.AND.push(baseSearchCriteria);
      criteria.AND[0].memberOf.curatedBy.AND[0].memberOf.id = facetValueId;
      return criteria;
    },
  },
};

export { FACETS_VIA_SEARCH_CONFIG };
