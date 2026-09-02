import { NotImplementedError } from '/lib/errorClasses.mjs';

class SearchPatternInterface {
  apply(scp, searchTerm, logicType, patternOptions) {
    throw new NotImplementedError(
      `${this.constructor.name}.apply must be implemented.`,
    );
  }

  mayTokenizeValue() {
    throw new NotImplementedError(
      `${this.constructor.name}.mayTokenizeValue must be implemented.`,
    );
  }

  // Names of required runtime properties (without leading underscore),
  // e.g. ['comp', 'annK', 'vectorDistance'].
  getRequiredRuntimeSearchTermProperties() {
    throw new NotImplementedError(
      `${this.constructor.name}.getRequiredRuntimeSearchTermProperties must be implemented.`,
    );
  }

  getAllowedChildren() {
    throw new NotImplementedError(
      `${this.constructor.name}.getAllowedChildren must be implemented.`,
    );
  }

  isConvertIdChildToIri() {
    throw new NotImplementedError(
      `${this.constructor.name}.isConvertIdChildToIri must be implemented.`,
    );
  }

  getAllowedSearchOptionsName() {
    throw new NotImplementedError(
      `${this.constructor.name}.getAllowedSearchOptionsName must be implemented.`,
    );
  }

  getDefaultSearchOptionsName() {
    throw new NotImplementedError(
      `${this.constructor.name}.getDefaultSearchOptionsName must be implemented.`,
    );
  }

  // Indicates whether this pattern's CTS query output has scoring semantics.
  // Must return a consistent value across all execution paths; patterns must
  // produce either always-scoring or always-non-scoring CTS queries regardless
  // of logicType, options, or other runtime context.
  //
  // If a new or modified pattern requires runtime context to determine scoring
  // capability (e.g., range queries with optional score-function options, or
  // conditional CTS functions based on dynamic state), an option is to extend
  // this method signature:
  //   contributesRelevanceScore(scp, searchTerm, logicType)
  //
  // CTS functions used by LUX that return relevance scores by default (return true):
  //   - cts.fieldWordQuery() not in where()
  //
  // CTS functions used by LUX that DO NOT score by default (return false):
  //   - cts.fieldRangeQuery()
  //   - cts.geospatialRegionQuery()
  //   - cts.pathGeospatialQuery()
  //   - cts.tripleRangeQuery()
  //
  // CTS functions used by LUX that CANNOT return relevance scores (return false):
  //   - cts.collectionQuery()
  //   - cts.documentQuery()
  //   - cts.fieldValueQuery()
  contributesRelevanceScore() {
    throw new NotImplementedError(
      `${this.constructor.name}.contributesRelevanceScore must be implemented.`,
    );
  }

  //#region Types of children allowed by the pattern; impl'd by base class.
  acceptsGroup() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsGroup must be implemented.`,
    );
  }

  acceptsTerm() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsTerm must be implemented.`,
    );
  }

  acceptsAtomicValue() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsAtomicValue must be implemented.`,
    );
  }

  onlyAcceptsAtomicValue() {
    throw new NotImplementedError(
      `${this.constructor.name}.onlyAcceptsAtomicValue must be implemented.`,
    );
  }
  //#endregion
}

export { SearchPatternInterface };
