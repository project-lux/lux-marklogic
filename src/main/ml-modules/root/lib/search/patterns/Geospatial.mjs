import {
  InvalidSearchRequestError,
  InternalServerError,
} from '../../errorClasses.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

// Operators supported by cts.geospatialRegionQuery.
const REGION_OPERATORS = Object.freeze([
  'contains',
  'covered-by',
  'covers',
  'crosses',
  'disjoint',
  'equals',
  'intersects',
  'overlaps',
  'touches',
  'within',
]);
const DEFAULT_REGION_OPERATOR = 'intersects';

const COORD_OPTIONS = ['coordinate-system=wgs84'];
const POINT_INDEX_OPTIONS = COORD_OPTIONS.concat(['type=point']);

class Geospatial extends SearchPatternBase {
  apply(searchCriteriaProcessor, searchTerm, logicType, patternOptions) {
    if (searchTerm.getSearchTermConfig().isGeospatialRegion()) {
      return this.#processRegionTerm(
        searchCriteriaProcessor,
        searchTerm,
        logicType,
        patternOptions,
      );
    }
    return this.#processPointTerm(
      searchCriteriaProcessor,
      searchTerm,
      logicType,
      patternOptions,
    );
  }

  // Region-index branch: cts.geospatialRegionQuery supports the full set of
  // ten topological operators against polygons, points, boxes, and circles
  // stored in the region index.
  #processRegionTerm(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
  ) {
    const operator = (
      searchTerm.getComparisonOperator() || DEFAULT_REGION_OPERATOR
    ).toLowerCase();
    if (!REGION_OPERATORS.includes(operator)) {
      throw new InvalidSearchRequestError(
        `Unsupported geospatial operator '${operator}' for the '${searchTerm.getName()}' search term. Allowed: ${REGION_OPERATORS.join(', ')}.`,
      );
    }
    const region = this.#parseGeoInput(searchTerm);
    const path = this.#getIndexReference(searchTerm);
    const ref = cts.geospatialRegionPathReference(path, COORD_OPTIONS);
    return {
      ctsConstraints: [cts.geospatialRegionQuery(ref, operator, region)],
    };
  }

  // Point-index branch: cts.pathGeospatialQuery has no operator; it returns
  // documents whose indexed point lies inside any of the supplied regions.
  #processPointTerm(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
  ) {
    const region = this.#parseGeoInput(searchTerm);
    const path = this.#getIndexReference(searchTerm);
    return {
      ctsConstraints: [
        cts.pathGeospatialQuery(path, region, POINT_INDEX_OPTIONS),
      ],
    };
  }

  #getIndexReference(searchTerm) {
    const indexRef = searchTerm.getSearchTermConfig().getIndexReferences()?.[0];
    if (!indexRef) {
      throw new InternalServerError(
        `The '${searchTerm.getName()}' search term must have at least one index reference configured to use the geospatial search pattern.`,
      );
    }
    return indexRef;
  }

  // Parse a search term's geospatial input value into a CTS region object.
  #parseGeoInput(searchTerm) {
    const value = searchTerm.getValue();
    const termName = searchTerm.getName();
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidSearchRequestError(
        `The '${termName}' search term requires a non-empty geospatial value.`,
      );
    }
    const trimmed = value.trim();
    try {
      return geo.parseWkt(trimmed);
    } catch (e) {
      throw new InvalidSearchRequestError(
        `The '${termName}' search term value could not be parsed as WKT: ${e.message ?? e}`,
      );
    }
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return null;
  }

  getDefaultSearchOptionsName() {
    return null;
  }
}

const GeospatialPattern = Object.freeze(new Geospatial());

export { GeospatialPattern };
