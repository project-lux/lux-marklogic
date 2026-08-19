import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/errorClasses.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_AMP_AS_ADMIN = 'ampAsAdmin';

// Frozen to prevent modification; exported to support unit testing.
const ENDPOINTS_CONFIG = Object.freeze({
  '/ds/lux/advancedSearchConfig.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/autoComplete.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/document/read.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/facets.mjs': {
    ampAsAdmin: true,
  },
  '/ds/lux/relatedList.mjs': {
    ampAsAdmin: true,
  },
  '/ds/lux/scaleOut.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/search.mjs': {
    ampAsAdmin: true,
  },
  '/ds/lux/searchEstimate.mjs': {
    ampAsAdmin: true,
  },
  '/ds/lux/searchInfo.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/searchWillMatch.mjs': {
    ampAsAdmin: true,
  },
  '/ds/lux/stats.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/storageInfo.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/translate.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/validateDataset.mjs': {
    ampAsAdmin: false,
  },
  '/ds/lux/versionInfo.mjs': {
    ampAsAdmin: false,
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
};
