import { ProcessorConfig } from './ProcessorConfig.mjs';
import { InvalidSearchRequestError } from '../../errorClasses.mjs';

// Multi-scope processing result status constants
const MULTI_SCOPE_STATUS = {
  CONTINUE_NORMAL_PROCESSING: 'CONTINUE_NORMAL_PROCESSING',
  RECURSION_USED: 'RECURSION_USED',
  QUERY_BUILT: 'QUERY_BUILT',
};

/**
 * Handles multi-scope search criteria processing
 * Extracts the complex branching logic from SearchCriteriaProcessor.process()
 */
class MultiScopeProcessor {
  /**
   * UNIT TEST CANDIDATE: Multi-scope criteria processing with clear input/output contracts
   * Processes multi-scope search criteria by handling OR array logic
   *
   * @param {SearchCriteriaProcessor} processor - The main processor instance
   * @param {Array} orArray - OR array from resolved search criteria
   * @param {Object} processParams - Parameters to pass to recursive process calls
   * @returns {Object} Result object with status and optional queryString
   *   - status: MULTI_SCOPE_STATUS constant value
   *   - queryString?: string (present when status is QUERY_BUILT)
   */
  processMultiScopeSearch(processor, orArray, processParams) {
    const {
      searchPatternOptions,
      includeTypeConstraint,
      page,
      pageLength,
      pageWith,
      sortCriteria,
      valuesOnly,
    } = processParams;

    // Validate OR array
    processor.constructor._requireSearchCriteriaArray(orArray);

    if (orArray.length === 0) {
      // if OR array is empty, continue with normal processing to trigger validation error
      return { status: MULTI_SCOPE_STATUS.CONTINUE_NORMAL_PROCESSING };
    }

    if (orArray.length === 1) {
      // Single item - recurse with the single criteria
      processor.process(
        orArray[0],
        null, // search criteria must define scope
        false, // reject nested multi scope requests
        searchPatternOptions,
        includeTypeConstraint,
        page,
        pageLength,
        pageWith,
        sortCriteria,
        valuesOnly,
      );
      // Return status indicating that recursion was used
      return { status: MULTI_SCOPE_STATUS.RECURSION_USED };
    }

    // Multiple items - build OR query
    const queryString = this._buildMultiScopeOrQuery(
      processor,
      orArray,
      processParams,
    );
    return { status: MULTI_SCOPE_STATUS.QUERY_BUILT, queryString };
  }

  /**
   * UNIT TEST CANDIDATE: OR query building for multiple sub-criteria
   * Builds a CTS OR query from multiple search criteria
   *
   * @param {SearchCriteriaProcessor} processor - The main processor instance
   * @param {Array} orArray - Array of search criteria objects
   * @param {Object} processParams - Parameters for sub-processors
   * @returns {string} CTS OR query string
   */
  _buildMultiScopeOrQuery(processor, orArray, processParams) {
    const {
      searchPatternOptions,
      includeTypeConstraint,
      page,
      pageLength,
      pageWith,
      sortCriteria,
      valuesOnly,
    } = processParams;

    const { filterResults, facetsAreLikely, synonymsEnabled } =
      processor.requestOptions;
    const SearchCriteriaProcessor = processor.constructor;

    const subQueries = orArray.map((subCriteria, index, array) => {
      const subScope = subCriteria._scope;
      const searchCriteriaProcessor = new SearchCriteriaProcessor(
        filterResults,
        facetsAreLikely,
        synonymsEnabled,
      );

      try {
        searchCriteriaProcessor.process(
          subCriteria,
          null, // search criteria must define scope
          false, // reject nested multi scope requests
          searchPatternOptions,
          includeTypeConstraint,
          page,
          pageLength,
          pageWith,
          sortCriteria,
          valuesOnly,
        );
      } catch (e) {
        // Add scope context to error message
        e.message = `Error in scope '${subScope}': ${e.message}`;
        throw e;
      }

      return searchCriteriaProcessor.getCtsQueryStr();
    });

    return `${ProcessorConfig.CTS_QUERY_FUNCTIONS.OR}([${subQueries.join(', ')}])`;
  }

  /**
   * Validates multi-scope requirements and throws appropriate errors
   *
   * @param {boolean} allowMultiScope - Whether multi-scope is allowed
   * @param {Object} resolvedSearchCriteria - Processed search criteria
   */
  validateMultiScopeRequirements(allowMultiScope, resolvedSearchCriteria) {
    if (!allowMultiScope) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('MULTI_SCOPE_NOT_SUPPORTED'),
      );
    }

    if (!resolvedSearchCriteria.OR) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('MULTI_SCOPE_REQUIRES_OR'),
      );
    }
  }
}

export { MultiScopeProcessor, MULTI_SCOPE_STATUS };
