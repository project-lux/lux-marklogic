/**
 * Configuration constants and utilities for SearchCriteriaProcessor
 * Consolidates magic strings, error messages, and shared configuration
 */

// UNIT TEST CANDIDATE: Constants and error message generation
class ProcessorConfig {
  // Reserved property names that should not be treated as search terms
  static RESERVED_PROPERTY_NAMES = ['_scope', '_valueType'];

  // Search scope constants
  static SEARCH_SCOPE_MULTI = 'multi';

  // Default values
  static DEFAULT_WEIGHT = 1.0;

  // Regular expressions
  static PUNCTUATION_REGEX = /^[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]*$/;
  static NEAR_OPERATOR_REGEX = /(\s)(NEAR)(\s)/gi;
  static BRACKET_REGEX = /\[|\]/g;
  static PHRASE_QUOTE_REGEX = /^('|").+\1$/;
  static COLON_TERM_REGEX = /:/;

  // CTS query building
  static CTS_QUERY_TYPES = {
    AND: 'andQuery',
    OR: 'orQuery',
    NOT: 'notQuery',
    BOOST: 'boostQuery',
  };

  static CTS_QUERY_FUNCTIONS = {
    AND: 'cts.andQuery',
    OR: 'cts.orQuery',
    NOT: 'cts.notQuery',
    BOOST: 'cts.boostQuery',
    TRUE: 'cts.trueQuery',
    FALSE: 'cts.falseQuery',
  };

  // Error message templates
  static ERROR_MESSAGES = {
    SEARCH_SCOPE_NOT_SPECIFIED: 'search scope not specified.',
    INVALID_SEARCH_SCOPE: (scope) => `'${scope}' is not a valid search scope.`,
    MULTI_SCOPE_NOT_SUPPORTED: `search scope of 'multi' not supported by this operation or level.`,
    MULTI_SCOPE_REQUIRES_OR: `a search with scope 'multi' must contain an 'OR' array`,
    MORE_CRITERIA_REQUIRED: 'more search criteria is required.',
    IGNORED_TERMS_ONLY: (terms) =>
      `the search criteria given only contains '${terms.join("', '")}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`,
    TERM_REQUIRES_VALUE: (termName) =>
      `the '${termName}' term requires a value.`,
    MULTIPLE_TERM_NAMES: (criteria) =>
      `search term defines more than one term name in criteria ${JSON.stringify(criteria)}`,
    NO_TERM_NAME: (criteria) =>
      `search term does not specify a term name in criteria ${JSON.stringify(criteria)}`,
    TERM_CONTAINS_GROUP_NOT_ALLOWED: (termName) =>
      `the '${termName}' term contains a group but is not allowed to.`,
    TERM_CONTAINS_TERM_NOT_ALLOWED: (termName) =>
      `the '${termName}' term contains another term but is not allowed to.`,
    TERM_NO_ATOMIC_VALUES: (termName, scopeName) =>
      `the search term '${termName}' in scope '${scopeName}' does not accept atomic values.`,
    TERM_ONLY_ID_CHILD: (termName, scopeName) =>
      `the search term '${termName}' in scope '${scopeName}' only supports the 'id' child search term.`,
    INVALID_TARGET_SCOPE: (termName, targetScope) =>
      `The '${termName}' search term is configured to an invalid target scope: '${targetScope}'`,
    NO_TERMS_FOR_SCOPE: (scopeName) =>
      `No terms are configured to the '${scopeName}' search scope.`,
    INVALID_TERM_FOR_SCOPE: (termName, scopeName, validChoices) =>
      `the '${termName}' term is invalid for the '${scopeName}' search scope. Valid choices: ${validChoices.join(', ')}`,
    BOOST_REQUIRES_TWO_ITEMS:
      'the BOOST operator requires an array of two items.',
    NOT_REQUIRES_OBJECT_OR_ARRAY: (criteria) =>
      `object or array expected for NOT search criteria but given ${JSON.stringify(criteria)}`,
    OBJECT_EXPECTED: (criteria) =>
      `object expected but given ${JSON.stringify(criteria)}`,
    ARRAY_EXPECTED: (criteria) =>
      `array expected but given ${JSON.stringify(criteria)}`,
    TOKENIZE_NON_STRING:
      '_tokenizeSearchTermValue must be given a non-null string.',
    UNABLE_TO_PARSE_CRITERIA: (criteria) =>
      `unable to parse criteria ${criteria}`,
    UNSUPPORTED_GRAMMAR_PORTION: (propName) =>
      `'${propName}' is not a supported portion of the search string grammar.`,
  };

  // Page limit constants
  static MAXIMUM_PAGE_WITH_LENGTH = 100000;

  // Log messages for structured logging
  static LOG_MESSAGES = {
    EXCEEDED_PAGE_LIMIT: (limit, criteria) =>
      `The search exceeded the ${limit} limit with base search criteria ${JSON.stringify(criteria)}`,
    EXCEEDED_PAGE_WITH_LIMIT: (limit, criteria) =>
      `The search exceeded the pageWith limit (${limit}) with base search criteria ${JSON.stringify(criteria)}`,
    IGNORING_SEARCH_OPTION: (option) =>
      `Ignoring search term option '${option}' from cts.parse result.`,
  };

  /**
   * UNIT TEST CANDIDATE: Error message generation with parameters
   * @param {string} messageKey - Key from ERROR_MESSAGES
   * @param {...any} params - Parameters for message template
   * @returns {string} Formatted error message
   */
  static getErrorMessage(messageKey, ...params) {
    const template = ProcessorConfig.ERROR_MESSAGES[messageKey];
    if (typeof template === 'function') {
      return template(...params);
    }
    return template;
  }

  /**
   * UNIT TEST CANDIDATE: Log message generation with parameters
   * @param {string} messageKey - Key from LOG_MESSAGES
   * @param {...any} params - Parameters for message template
   * @returns {string} Formatted log message
   */
  static getLogMessage(messageKey, ...params) {
    const template = ProcessorConfig.LOG_MESSAGES[messageKey];
    if (typeof template === 'function') {
      return template(...params);
    }
    return template;
  }
}

export { ProcessorConfig };
