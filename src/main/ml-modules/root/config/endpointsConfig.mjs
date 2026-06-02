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
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/autoComplete.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/document/create.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: false,
    features: { myCollections: true },
  },
  '/ds/lux/document/delete.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: false,
    features: { myCollections: true },
  },
  '/ds/lux/document/read.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/document/update.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: false,
    features: { myCollections: true },
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
    ampAsAdmin: false,
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
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/searchWillMatch.mjs': {
    ampAsAdmin: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/stats.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/storageInfo.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/tenantStatus/get.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/tenantStatus/set.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/translate.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/validateDataset.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/lux/versionInfo.mjs': {
    ampAsAdmin: false,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
});

function getCurrentEndpointPath() {
  return xdmp.getRequestPath();
}

function getCurrentEndpointConfig(myCollectionsFeatureEnabled = true) {
  const endpointConfig = ENDPOINTS_CONFIG[getCurrentEndpointPath()];
  if (isUndefined(endpointConfig)) {
    if (myCollectionsFeatureEnabled) {
      throw new InternalConfigurationError(
        `The ${getCurrentEndpointPath()} endpoint is not configured.`,
      );
    }
    return null;
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
