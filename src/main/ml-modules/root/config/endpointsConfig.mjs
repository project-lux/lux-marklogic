import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const ENDPOINTS_CONFIG = {
  '/ds/lux/stats.mjs': {
    features: { myCollections: false },
    allowInReadOnlyMode: true,
    executeAsServiceAccountWhenSpecified: true,
  },
  '/ds/myLux/createSet.mjs': {
    features: { myCollections: true },
    allowInReadOnlyMode: false,
    executeAsServiceAccountWhenSpecified: false,
  },
  '/ds/myLux/readSet.mjs': {
    features: { myCollections: true },
    allowInReadOnlyMode: true,
    executeAsServiceAccountWhenSpecified: true,
  },
  '/ds/myLux/downloadSet.mjs': {
    features: { myCollections: true },
    allowInReadOnlyMode: true,
    executeAsServiceAccountWhenSpecified: true,
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

export { getCurrentEndpointConfig, getCurrentEndpointPath };
