/*
 * While not necessarily ideal, this module maps frontend search scopes to backend knowledge.  Given a
 * known search scope, the backend knows which types and fields to restrict a search request to, as well
 * as provide estimates for all search scopes.
 */

const SEARCH_SCOPES = {
  agent: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 3,
    fields: ['agentAnyText'],
    predicates: ['lux("agentAny")'],
    types: ['Person', 'Group'],
  },
  concept: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 5,
    fields: ['conceptAnyText'],
    predicates: ['lux("conceptAny")'],
    types: ['Currency', 'Language', 'Material', 'MeasurementUnit', 'Type'],
  },
  event: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 6,
    fields: ['eventAnyText'],
    predicates: ['lux("eventAny")'],
    types: ['Activity', 'Period'],
  },
  // "item" and "object" are synonyms; but backend uses "item"
  item: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 1,
    fields: ['itemAnyText'],
    predicates: ['lux("itemAny")'],
    types: ['DigitalObject', 'HumanMadeObject'],
  },
  multi: {
    isUserInterfaceSearchScope: false,
    fields: [],
    predicates: [],
    types: [],
  },
  place: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 4,
    fields: ['placeAnyText'],
    predicates: ['lux("placeAny")'],
    types: ['Place'],
  },
  reference: {
    isUserInterfaceSearchScope: false,
    fields: ['referenceAnyText'],
    predicates: ['lux("referenceAny")'],
    types: [
      'Group',
      'Person',
      'Place',
      'Activity',
      'Period',
      'Type',
      'Language',
      'MeasurementUnit',
    ],
  },
  set: {
    isUserInterfaceSearchScope: true,
    fields: ['setAnyText'],
    predicates: ['lux("setAny")'],
    types: ['Set'],
  },
  work: {
    isUserInterfaceSearchScope: true,
    userInterfaceOrder: 2,
    fields: ['workAnyText'],
    predicates: ['lux("workAny")'],
    types: ['LinguisticObject', 'VisualItem'],
  },
};

// Get all search scopes
function getSearchScopes() {
  return SEARCH_SCOPES;
}

// Get the names of all the search scopes
function getSearchScopeNames() {
  return Object.keys(SEARCH_SCOPES);
}

// Get a search scope's object by name; returns null when name isn't the name of a search scope.
function getSearchScope(name) {
  return name == null ? name : SEARCH_SCOPES[name.toLowerCase()];
}

// Determine if the given name a search scope name.
function isSearchScopeName(name) {
  return getSearchScope(name) != null;
}

/**
 * Get the fields associated with the specified search scope, all, or none.
 *
 * @param {String} searchScopeName - The search scope the current request is in.  When not null,
 *    the scope determines the field(s) returned.
 * @param {Boolean} defaultToAll - Only applicable when the above parameter is not applicable.  Submit false
 *    to override the default of getting the fields associated with all search scopes; when false, an
 *    empty array may be returned.
 * @returns {Array} Array of fields.
 */
function getSearchScopeFields(searchScopeName = null, defaultToAll = true) {
  let values = [];
  const searchScopeObj = getSearchScope(searchScopeName);
  if (searchScopeObj) {
    values = searchScopeObj.fields;
  } else if (defaultToAll === true) {
    getSearchScopeNames().forEach((name) => {
      values = values.concat(SEARCH_SCOPES[name].fields);
    });
  }
  return values;
}

/**
 * Get the predicates associated with the specified search scope, all, or none.
 *
 * @param {String} searchScopeName - The search scope the current request is in.  When not null,
 *    the scope determines the field(s) returned.
 * @returns {Array} Array of predicates.  When searchScopeName is null, ['lux("any")'] is returned.
 */
function getSearchScopePredicates(searchScopeName = null) {
  const searchScopeObj = getSearchScope(searchScopeName);
  if (searchScopeObj) {
    return searchScopeObj.predicates;
  }
  return ['lux("any")'];
}

/**
 * Get the types associated with the specified search scope, all, or none.
 *
 * @param {String} searchScopeName - The search scope the current request is in.  When not null,
 *    the scope determines the types(s) returned.
 * @param {Boolean} defaultToAll - Only applicable when the above parameter is not applicable.  Submit false
 *    to override the default of getting the types associated with all search scopes; when false, an
 *    empty array may be returned.
 * @returns {Array} Array of types.
 */
function getSearchScopeTypes(searchScopeName = null, defaultToAll = true) {
  let values = [];
  const searchScopeObj = getSearchScope(searchScopeName);
  if (searchScopeObj) {
    values = searchScopeObj.types;
  } else if (defaultToAll === true) {
    getSearchScopeNames().forEach((name) => {
      values = values.concat(SEARCH_SCOPES[name].types);
    });
  }
  return values;
}

function doesSearchScopeHaveType(scopeName, type) {
  const searchScopeObj = getSearchScope(scopeName);
  return searchScopeObj && searchScopeObj.types.includes(type);
}

function getCorrectlyCasedType(givenType) {
  let resolvedType = givenType;
  const lowerType = givenType.toLowerCase();
  getSearchScopeTypes().forEach((type) => {
    if (lowerType == type.toLowerCase()) {
      resolvedType = type;
    }
  });
  return resolvedType;
}

function isUserInterfaceSearchScopeName(searchScopeName) {
  return (
    getSearchScope(searchScopeName) &&
    getSearchScope(searchScopeName).isUserInterfaceSearchScope === true
  );
}

function getOrderedUserInterfaceSearchScopeNames() {
  return Object.keys(SEARCH_SCOPES)
    .filter((name) => {
      return SEARCH_SCOPES[name].isUserInterfaceSearchScope === true;
    })
    .sort((scope1, scope2) => {
      scope1.userInterfaceOrder > scope2.userInterfaceOrder ? 1 : -1;
    });
}

export {
  doesSearchScopeHaveType,
  getCorrectlyCasedType,
  getOrderedUserInterfaceSearchScopeNames,
  getSearchScopeFields,
  getSearchScopeNames,
  getSearchScopePredicates,
  getSearchScopeTypes,
  getSearchScopes,
  getSearchScope,
  isSearchScopeName,
  isUserInterfaceSearchScopeName,
};
