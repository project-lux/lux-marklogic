const CODE_VERSION = '@@codeVersion@@';

const ENVIRONMENT_NAME = '%%environmentName%%';

const ML_APP_NAME = '%%mlAppName%%';

const ENDPOINT_ACCESS_UNIT_NAMES = '%%endpointAccessUnitNames%%'.trim();

const FEATURE_MY_COLLECTIONS_ENABLED =
  '%%featureMyCollectionsEnabled%%'.trim() === 'true';

const COLLECTION_NAME_MY_COLLECTIONS_FEATURE = 'myCollectionsFeature';

// Unit test-related constants are primarily used to prevent use of a function
// that allows the caller to specify the endpoint configuration to apply.
const UNIT_TEST_ENDPOINT = '/test/default.xqy';
const ROLE_NAME_MAY_RUN_UNIT_TESTS = '%%mlAppName%%-may-run-unit-tests';

const RELATED_LIST_TIMEOUT = parseInt('%%relatedListTimeout%%'.trim());
const SEMANTIC_SORT_TIMEOUT = parseInt('%%semanticSortTimeout%%'.trim());

const RELATED_LIST_PAGE_LENGTH_DEFAULT = 25;

const RELATED_LIST_PER_RELATION_DEFAULT = parseInt(
  '%%relatedListPerRelationDefault%%'.trim()
);
const RELATED_LIST_PER_RELATION_MAX = parseInt(
  '%%relatedListPerRelationMax%%'.trim()
);

const DEFAULT_FILTER_SEARCH_RESULTS =
  '%%filterSearchResults%%'.trim() === 'true';
const DEFAULT_FILTER_RELATED_LIST_SEARCH_RESULTS =
  '%%filterRelatedListSearchResults%%'.trim() === 'true';

const FULL_TEXT_SEARCH_RELATED_FIELD_NAME =
  '%%fullTextSearchRelatedFieldName%%'.trim();

const LOW_STORAGE_CRITICAL_THRESHOLD = parseInt(
  '%%lowStorageCriticalThreshold%%'.trim()
);
const LOW_STORAGE_WARNING_THRESHOLD = parseInt(
  '%%lowStorageWarningThreshold%%'.trim()
);
const HIGH_STORAGE_WARNING_THRESHOLD = parseInt(
  '%%highStorageWarningThreshold%%'.trim()
);

const BASE_URL = 'https://lux.collections.yale.edu';
const FACETS_PREFIX = `${BASE_URL}/api/facets`;
const IRI_PREFIX = `${BASE_URL}/data/`;
const PERSON_PREFIX = `${IRI_PREFIX}person/`;
const RELATED_LIST_PREFIX = `${BASE_URL}/api/related-list`;
const SEARCH_PREFIX = `${BASE_URL}/api/search`;
const SEARCH_ESTIMATE_PREFIX = `${BASE_URL}/api/search-estimate`;

const AS_TYPE_COLLECTION = 'Collection';
const AS_TYPE_ORDERED_COLLECTION = 'OrderedCollection';
const AS_TYPE_ORDERED_COLLECTION_PAGE = 'OrderedCollectionPage';

const LUX_CONTEXT = 'https://linked.art/ns/v1/search.json';

// Used in contexts when at least one URI should be specified to avoid requesting any match.
const IRI_DOES_NOT_EXIST = '/does/not/exist';

const TOKEN_RUNTIME_PARAM = '@@RUNTIME_PARAM@@';

const SEARCH_OPTIONS_NAME_EXACT = 'exact';
const SEARCH_OPTIONS_NAME_KEYWORD = 'keyword';

const ALLOWED_SEARCH_OPTIONS_EXACT = ['exact'];
// Text search options align with word and value queries, but not range queries.
// we do not allow keyword searches to be whitespace-sensitive or exact, as this creates incorrect estimates
const ALLOWED_SEARCH_OPTIONS_KEYWORD = [
  'case-sensitive',
  'case-insensitive',
  'diacritic-sensitive',
  'diacritic-insensitive',
  'punctuation-sensitive',
  'punctuation-insensitive',
  'whitespace-insensitive',
  'stemmed',
  'unstemmed',
  'wildcarded',
  'unwildcarded',
];

const DEFAULT_SEARCH_OPTIONS_EXACT = ['exact'];
const DEFAULT_SEARCH_OPTIONS_KEYWORD = [
  'case-insensitive',
  'diacritic-insensitive',
  'punctuation-insensitive',
  'whitespace-insensitive',
  'stemmed',
  'wildcarded',
];

// A map of term-level search options to their opposite search option.
const SEARCH_OPTIONS_INVERSE_MAP = {
  'case-sensitive': ['case-insensitive'],
  'case-insensitive': ['case-sensitive'],
  'diacritic-sensitive': ['diacritic-insensitive'],
  'diacritic-insensitive': ['diacritic-sensitive'],
  'punctuation-sensitive': ['punctuation-insensitive'],
  'punctuation-insensitive': ['punctuation-sensitive'],
  'whitespace-sensitive': ['whitespace-insensitive'],
  'whitespace-insensitive': ['whitespace-sensitive'],
  stemmed: ['unstemmed'],
  unstemmed: ['stemmed'],
  wildcarded: ['unwildcarded'],
  unwildcarded: ['wildcarded'],
};

const SEARCH_GRAMMAR_OPERATORS = [
  'AND',
  'OR',
  'NOT_IN',
  'BOOST',
  // 'NEAR', // Until we know what "near" means in the semantic world, let's not auto-capitalize 'near'.
  // 'EQ', // Not presently supporting comparison operators in the LUX String Search Grammar.
  // 'NE',
  // 'LT',
  // 'LE',
  // 'GT',
  // 'GE',
];

// Account for NEAR being optionally followed by a slash and number.
const REG_EXP_NEAR_OPERATOR = new RegExp('(\\s)NEAR((?:/[^\\s])?\\s)', 'g');

const SPARQL_PREFIXES = `
prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>
prefix dig: <http://www.ics.forth.gr/isl/CRMdig/>
prefix la: <https://linked.art/ns/terms/>
prefix lux: <https://lux.collections.yale.edu/ns/>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix skos: <http://www.w3.org/2004/02/skos/core#>
prefix sci: <http://www.ics.forth.gr/isl/CRMsci/>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>`;

const SYNONYM_WEIGHT = -0.5; // Could make this configurable via property or endpoint param.
const SYNONYMS_ENABLED = '%%synonymsEnabled%%'.trim() === 'true';
const THESAURUS_URIS = ['/thesauri/sample-thesaurus.xml'];

const TRACE_NAME_ERROR = 'LuxError';
const TRACE_NAME_FACETS = 'LuxFacets';
const TRACE_NAME_RELATED_LIST = 'LuxRelatedList';
const TRACE_NAME_PROFILES = 'LuxNamedProfiles';
const TRACE_NAME_SEARCH = 'LuxSearch';

export {
  ALLOWED_SEARCH_OPTIONS_EXACT,
  ALLOWED_SEARCH_OPTIONS_KEYWORD,
  AS_TYPE_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  BASE_URL,
  CODE_VERSION,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  DEFAULT_FILTER_SEARCH_RESULTS,
  DEFAULT_FILTER_RELATED_LIST_SEARCH_RESULTS,
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  ENDPOINT_ACCESS_UNIT_NAMES,
  ENVIRONMENT_NAME,
  FACETS_PREFIX,
  FEATURE_MY_COLLECTIONS_ENABLED,
  FULL_TEXT_SEARCH_RELATED_FIELD_NAME,
  HIGH_STORAGE_WARNING_THRESHOLD,
  IRI_DOES_NOT_EXIST,
  IRI_PREFIX,
  LOW_STORAGE_CRITICAL_THRESHOLD,
  LOW_STORAGE_WARNING_THRESHOLD,
  LUX_CONTEXT,
  ML_APP_NAME,
  PERSON_PREFIX,
  REG_EXP_NEAR_OPERATOR,
  RELATED_LIST_PAGE_LENGTH_DEFAULT,
  RELATED_LIST_PER_RELATION_DEFAULT,
  RELATED_LIST_PER_RELATION_MAX,
  RELATED_LIST_PREFIX,
  RELATED_LIST_TIMEOUT,
  ROLE_NAME_MAY_RUN_UNIT_TESTS,
  SEARCH_ESTIMATE_PREFIX,
  SEARCH_GRAMMAR_OPERATORS,
  SEARCH_OPTIONS_INVERSE_MAP,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
  SEARCH_PREFIX,
  SEMANTIC_SORT_TIMEOUT,
  SPARQL_PREFIXES,
  SYNONYM_WEIGHT,
  SYNONYMS_ENABLED,
  THESAURUS_URIS,
  TOKEN_RUNTIME_PARAM,
  TRACE_NAME_ERROR,
  TRACE_NAME_FACETS,
  TRACE_NAME_PROFILES,
  TRACE_NAME_RELATED_LIST,
  TRACE_NAME_SEARCH,
  UNIT_TEST_ENDPOINT,
};
