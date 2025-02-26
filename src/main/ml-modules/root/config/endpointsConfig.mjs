import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';
import { readSet } from '../lib/myLux.mjs';

const ENDPOINTS_CONFIG = {
  '/ds/lux/stats.mjs': {
    executeAsServiceAccountWhenSpecified: true,
  },
  '/ds/myLux/createSet.mjs': {
    executeAsServiceAccountWhenSpecified: false,
  },
  '/ds/myLux/readSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    receivingServiceAccountFunction: readSet,
  },
  '/ds/myLux/downloadSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    receivingServiceAccountFunction: 'not a function',
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
