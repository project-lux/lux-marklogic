import { IDENTIFIERS } from '../lib/identifierConstants.mjs';

const FACETS_VIA_SEARCH_CONFIG = {
  responsibleCollections: {
    getFacetValuesCriteria: (baseSearchCriteria) => {
      // If changing this criteria, do so within responsibleUnits too.
      const criteria = {
        _scope: 'set',
        AND: [
          {
            containingItem: baseSearchCriteria,
          },
          {
            classification: {
              identifier: IDENTIFIERS.collection,
            },
          },
        ],
      };
      return criteria;
    },
    getFacetValueCountCriteria: (baseSearchCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              id: facetValueId,
            },
          },
          baseSearchCriteria,
        ],
      };
      return criteria;
    },
  },
  responsibleUnits: {
    getFacetValuesCriteria: (baseSearchCriteria) => {
      const criteria = {
        _scope: 'agent',
        OR: [
          {
            memberOfInverse: {
              AND: [
                {
                  curated: {
                    containingItem: baseSearchCriteria,
                  },
                },
                {
                  classification: {
                    identifier: IDENTIFIERS.department,
                  },
                },
              ],
            },
          },
          {
            AND: [
              {
                curated: {
                  containingItem: baseSearchCriteria,
                },
              },
              {
                NOT: {
                  classification: {
                    identifier: IDENTIFIERS.department,
                  },
                },
              },
            ],
          },
        ],
      };
      return criteria;
    },
    getFacetValueCountCriteria: (baseSearchCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              curatedBy: {
                OR: [
                  {
                    memberOf: {
                      id: facetValueId,
                    },
                  },
                  {
                    id: facetValueId,
                  },
                ],
              },
            },
          },
          baseSearchCriteria,
        ],
      };
      return criteria;
    },
  },
};

export { FACETS_VIA_SEARCH_CONFIG };
