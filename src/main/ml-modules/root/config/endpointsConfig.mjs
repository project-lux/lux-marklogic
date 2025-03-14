import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_ALLOW_IN_READ_ONLY_MODE = 'allowInReadOnlyMode';
const PROP_NAME_FEATURES = 'features';
const PROP_NAME_MY_COLLECTIONS = 'myCollections';

const ENDPOINTS_CONFIG = {
  '/test/default.xqy': {
    allowInReadOnlyMode: true,
    features: { myCollections: true },
  },
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
  '/ds/myLux/notMyCollectionsExample.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/myLux/myCollectionsWriteExample.mjs': {
    allowInReadOnlyMode: false,
    features: { myCollections: true },
  },
  '/ds/myLux/myCollectionsReadExample.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: true },
  },
  '/ds/myLux/misconfiguredExample.mjs': {
    allowInReadOnlyMode: true,
    features: {},
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
