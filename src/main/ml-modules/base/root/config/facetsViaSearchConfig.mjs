import { getIRI } from "../lib/dataConstants.mjs";

const FACETS_VIA_SEARCH_CONFIG = {
  responsibleCollections: {
    getFacetValuesCriteria: (baseSearchCriteria) => {
      // If changing this criteria, do so within responsibleUnits too.
      const criteria = {
        _scope: "set",
        AND: [
          {
            containing: baseSearchCriteria,
          },
          {
            classification: {
              id: getIRI("collection"),
            },
          },
        ],
      };
      return criteria;
    },
    getFacetValueCountCriteria: (baseSearchCriteria, facetValueId) => {
      const criteria = {
        _scope: "item",
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
        _scope: "agent",
        OR: [
          {
            memberOfInverse: {
              AND: [
                {
                  curated: {
                    containing: baseSearchCriteria,
                  },
                },
                {
                  classification: {
                    id: getIRI("department"),
                  },
                },
              ],
            },
          },
          {
            AND: [
              {
                curated: {
                  containing: baseSearchCriteria,
                },
              },
              {
                NOT: {
                  classification: {
                    id: getIRI("department"),
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
        _scope: "item",
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
