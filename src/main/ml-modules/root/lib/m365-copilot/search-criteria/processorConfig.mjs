// ProcessorConfig.mjs
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import { isSearchScopeName } from '../../searchScope.mjs';
import { SearchPatternOptions } from '../../SearchPatternOptions.mjs';
import * as utils from '../../../utils/utils.mjs';

// UNIT TEST CANDIDATE: scope normalization and precedence
export function initProcessState(
  self,
  {
    scopeName,
    allowMultiScope,
    searchPatternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    pageWith,
    sortCriteria,
    valuesOnly,
  },
) {
  self.scopeName = scopeName;
  self.allowMultiScope = allowMultiScope;
  self.page = page;
  self.pageLength = pageLength;
  self.pageWith = pageWith;
  self.sortCriteria = sortCriteria;
  self.valuesOnly = valuesOnly;

  self.searchPatternOptions = searchPatternOptions
    ? searchPatternOptions
    : new SearchPatternOptions();

  self.includeTypeConstraint = includeTypeConstraint;

  // reset per-invocation fields
  self.criteriaCnt = 0;
  self.ignoredTerms = [];
  self.ctsQueryTemplate = '';
  self.ctsQueryStr = '';
  self.values = [];
}

// Resolves the scope from criteria, validates it, and applies it to self/requestOptions
export function resolveAndValidateScope(self) {
  const sc = self.resolvedSearchCriteria;
  if (sc && utils.isNonEmptyString(sc._scope)) {
    const normalized = sc._scope.trim().toLowerCase();
    if (isSearchScopeName(normalized)) {
      self.scopeName = normalized;
      delete sc._scope;
      self.requestOptions.scopeName = normalized; // some patterns need this
      return;
    }
    throw new InvalidSearchRequestError(
      `'${sc._scope}' is not a valid search scope.`,
    );
  }
  throw new InvalidSearchRequestError(`search scope not specified.`);
}
