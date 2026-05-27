import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/errorClasses.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_AMP_AS_ADMIN = 'ampAsAdmin';
const PROP_NAME_ALLOW_IN_READ_ONLY_MODE = 'allowInReadOnlyMode';
const PROP_NAME_FEATURES = 'features';
const PROP_NAME_MY_COLLECTIONS = 'myCollections';

// Frozen to prevent modification; exported to support unit testing.
const ENDPOINTS_CONFIG = Object.freeze({
  '/ds/lux/advancedSearchConfig.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/autoComplete.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/document/create.mjs': {
    allowInReadOnlyMode: false,
    features: { myCollections: false },
  },
  '/ds/lux/document/delete.mjs': {
    allowInReadOnlyMode: false,
    features: { myCollections: false },
  },
  '/ds/lux/document/read.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/document/update.mjs': {
    allowInReadOnlyMode: false,
    features: { myCollections: false },
  },
  '/ds/lux/facets.mjs': {
    ampAsAdmin: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/relatedList.mjs': {
    ampAsAdmin: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/scaleOut.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/search.mjs': {
    ampAsAdmin: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchEstimate.mjs': {
    ampAsAdmin: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchInfo.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchWillMatch.mjs': {
    ampAsAdmin: true,
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
  '/ds/lux/tenantStatus/get.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/tenantStatus/set.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/translate.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/validateDataset.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/versionInfo.mjs': {
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
});

function getCurrentEndpointPath() {
  return xdmp.getRequestPath();
}

function getCurrentEndpointConfig() {
  const endpointConfig = ENDPOINTS_CONFIG[getCurrentEndpointPath()];
  if (isUndefined(endpointConfig)) {
    throw new InternalConfigurationError(
      `The ${getCurrentEndpointPath()} endpoint is not configured.`,
    );
  }
  return new EndpointConfig(endpointConfig);
}

export {
  getCurrentEndpointConfig,
  getCurrentEndpointPath,
  ENDPOINTS_CONFIG,
  PROP_NAME_AMP_AS_ADMIN,
  PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
  PROP_NAME_FEATURES,
  PROP_NAME_MY_COLLECTIONS,
};
