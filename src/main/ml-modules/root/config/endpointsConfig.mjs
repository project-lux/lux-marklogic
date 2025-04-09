import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_ALLOW_IN_READ_ONLY_MODE = 'allowInReadOnlyMode';
const PROP_NAME_FEATURES = 'features';
const PROP_NAME_MY_COLLECTIONS = 'myCollections';

// Do not export this config or otherwise enable the runtime environment
// to modify it.
const ENDPOINTS_CONFIG = {
  '/ds/lux/advancedSearchConfig.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/autoComplete.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/document.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/facets.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/myCollections/set/create.mjs': {
    allowInReadOnlyMode: false,
    features: { myCollections: true },
  },
  '/ds/lux/relatedList.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/search.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchEstimate.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchInfo.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchWillMatch.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/stats.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/storageInfo.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/translate.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/versionInfo.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
};

function getCurrentEndpointPath() {
  return xdmp.getRequestPath();
}

function getCurrentEndpointConfig() {
  const endpointConfig = ENDPOINTS_CONFIG[getCurrentEndpointPath()];
  if (isUndefined(endpointConfig)) {
    throw new InternalConfigurationError(
      `The ${getCurrentEndpointPath()} endpoint is not configured.`
    );
  }
  return new EndpointConfig(endpointConfig);
}

export {
  getCurrentEndpointConfig,
  getCurrentEndpointPath,
  PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
  PROP_NAME_FEATURES,
  PROP_NAME_MY_COLLECTIONS,
};
