import { ProcessorConfig } from './ProcessorConfig.mjs';
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import * as utils from '../../../utils/utils.mjs';
import { applyPattern } from '../../searchPatternsLib.mjs';

/**
 * Handles CTS query building from search criteria
 * Extracts the complex branching logic from SearchCriteriaProcessor.generateQueryFromCriteria()
 */
class CtsQueryBuilder {
  constructor() {
    // POTENTIAL OPTIMIZATION: Precompute handler mappings
    this.operatorHandlers = {
      AND: this._buildAndQuery.bind(this),
      OR: this._buildOrQuery.bind(this),
      NOT: this._buildNotQuery.bind(this),
      BOOST: this._buildBoostQuery.bind(this),
    };
  }

  /**
   * UNIT TEST CANDIDATE: Main query building entry point with clear contracts
   * Builds CTS query string from search criteria using operator-specific handlers
   *
   * @param {Object} params - Query building parameters
   * @param {string} params.scopeName - Search scope name
   * @param {Object} params.searchCriteria - Search criteria object
   * @param {Object} params.parentSearchTerm - Parent search term (optional)
   * @param {boolean} params.mustReturnCtsQuery - Whether CTS query is required
   * @param {boolean} params.returnTrueForUnusableTerms - Whether to return cts.trueQuery for unusable terms
   * @param {SearchCriteriaProcessor} params.processor - Main processor instance
   * @returns {string} CTS query string
   */
  buildQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true,
    processor,
  }) {
    // Use the processor's static validation method
    processor.constructor._requireSearchCriteriaObject(searchCriteria);

    // Check for logical operators first
    const operatorType = this._detectOperatorType(searchCriteria);
    if (operatorType) {
      return this.operatorHandlers[operatorType]({
        scopeName,
        searchCriteria,
        parentSearchTerm,
        mustReturnCtsQuery,
        returnTrueForUnusableTerms,
        processor,
      });
    }

    // Handle search term (leaf node)
    return this._buildTermQuery({
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
      processor,
    });
  }

  /**
   * UNIT TEST CANDIDATE: Operator type detection
   * @param {Object} searchCriteria - Search criteria object
   * @returns {string|null} Operator type or null if not found
   */
  _detectOperatorType(searchCriteria) {
    const operators = ['AND', 'OR', 'NOT', 'BOOST'];
    for (const operator of operators) {
      if (searchCriteria.hasOwnProperty(operator)) {
        return operator;
      }
    }
    return null;
  }

  /**
   * UNIT TEST CANDIDATE: AND query building
   */
  _buildAndQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
    processor,
  }) {
    return this._buildGroupQuery('AND', searchCriteria.AND, {
      scopeName,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
      processor,
    });
  }

  /**
   * UNIT TEST CANDIDATE: OR query building
   */
  _buildOrQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
    processor,
  }) {
    return this._buildGroupQuery('OR', searchCriteria.OR, {
      scopeName,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
      processor,
    });
  }

  /**
   * UNIT TEST CANDIDATE: Group query building (AND/OR)
   * Handles both AND and OR query construction with optimizations
   */
  _buildGroupQuery(operatorType, groupArray, params) {
    const {
      scopeName,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
      processor,
    } = params;
    const isAnd = operatorType === 'AND';
    const SearchCriteriaProcessor = processor.constructor;

    SearchCriteriaProcessor._requireSearchCriteriaArray(groupArray);

    if (groupArray.length === 0) {
      return ''; // Ignore by returning empty string
    }

    if (!isAnd && groupArray.length === 1) {
      // Don't group an OR when there is only one item
      return processor.generateQueryFromCriteria(
        scopeName,
        groupArray[0],
        parentSearchTerm,
        false,
        true, // process() will catch if this is the only search criteria term and it gets ignored
      );
    }

    const subQueries = groupArray.map((item, idx) => {
      return processor.generateQueryFromCriteria(
        scopeName,
        item,
        parentSearchTerm,
        true,
        isAnd, // we want cts.trueQuery when within an AND
      );
    });

    const functionName = ProcessorConfig.CTS_QUERY_FUNCTIONS[operatorType];
    return `${functionName}([${subQueries.join(', ')}])`;
  }

  /**
   * UNIT TEST CANDIDATE: NOT query building
   */
  _buildNotQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
    processor,
  }) {
    const notCriteria = searchCriteria.NOT;

    if (utils.isArray(notCriteria)) {
      // Create an OR within NOT
      const orCriteria = {
        OR: notCriteria.map((item) => item),
      };
      return `${ProcessorConfig.CTS_QUERY_FUNCTIONS.NOT}(${processor.generateQueryFromCriteria(
        scopeName,
        orCriteria,
        parentSearchTerm,
        mustReturnCtsQuery,
        true, // ANDs impose their own value
      )})`;
    } else if (utils.isObject(notCriteria)) {
      return `${ProcessorConfig.CTS_QUERY_FUNCTIONS.NOT}(${processor.generateQueryFromCriteria(
        scopeName,
        notCriteria,
        parentSearchTerm,
        true,
        true, // We want cts.trueQuery so as to avoid cts.notQuery(cts.falseQuery)
      )})`;
    } else {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage(
          'NOT_REQUIRES_OBJECT_OR_ARRAY',
          searchCriteria,
        ),
      );
    }
  }

  /**
   * UNIT TEST CANDIDATE: BOOST query building
   */
  _buildBoostQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
    processor,
  }) {
    if (
      !utils.isArray(searchCriteria.BOOST) ||
      searchCriteria.BOOST.length !== 2
    ) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('BOOST_REQUIRES_TWO_ITEMS'),
      );
    }

    const matchingQuery = processor.generateQueryFromCriteria(
      scopeName,
      searchCriteria.BOOST[0],
      parentSearchTerm,
      true,
      false, // Do not search for everything
    );

    const boostingQuery = processor.generateQueryFromCriteria(
      scopeName,
      searchCriteria.BOOST[1],
      parentSearchTerm,
      true,
      false, // Do not boost by everything
    );

    return `${ProcessorConfig.CTS_QUERY_FUNCTIONS.BOOST}(
          ${matchingQuery},
          ${boostingQuery}
        )`;
  }

  /**
   * UNIT TEST CANDIDATE: Term query building (leaf nodes)
   * Handles individual search terms by parsing, validating, and applying patterns
   */
  _buildTermQuery({
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
    processor,
  }) {
    const searchTerm = processor._parseAndValidateTerm(
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
    );

    if (searchTerm.hasModifiedCriteria()) {
      // Term was tokenized into multiple terms, recurse with AND
      return processor.generateQueryFromCriteria(
        scopeName,
        searchTerm.getModifiedCriteria(),
        parentSearchTerm,
        mustReturnCtsQuery,
        true, // Unless logic in _parseAndValidateTerm changes, modified criteria will be an AND
      );
    }

    if (!searchTerm.isUsable()) {
      return returnTrueForUnusableTerms
        ? ProcessorConfig.CTS_QUERY_FUNCTIONS.TRUE + '()'
        : ProcessorConfig.CTS_QUERY_FUNCTIONS.FALSE + '()';
    }

    // Apply search pattern to generate query
    const patternResponse = applyPattern({
      searchCriteriaProcessor: processor,
      searchTerm,
      searchPatternOptions: processor.searchPatternOptions,
      requestOptions: processor.requestOptions,
    });

    this._processPatternResponse(patternResponse, processor);

    return utils.isNonEmptyString(patternResponse.codeStr)
      ? patternResponse.codeStr
      : '';
  }

  /**
   * Processes pattern response and updates processor state
   * @param {Object} patternResponse - Response from applyPattern
   * @param {SearchCriteriaProcessor} processor - Main processor instance
   */
  _processPatternResponse(patternResponse, processor) {
    // Handle values for related lists support
    if (utils.isNonEmptyArray(patternResponse.values)) {
      processor.values = processor.values.concat(patternResponse.values);
    }

    // Handle type constraint exclusion
    if (patternResponse.includeTypeConstraint === false) {
      processor.includeTypeConstraint = false;
    }

    // Increment criteria count for validation
    processor.criteriaCnt++;
  }
}

export { CtsQueryBuilder };
