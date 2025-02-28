import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_EXECUTE_AS_SERVICE_ACCOUNT_WHEN_SPECIFIED =
  'executeAsServiceAccountWhenSpecified';
const PROP_NAME_ALLOW_IN_READ_ONLY_MODE = 'allowInReadOnlyMode';
const PROP_NAME_FEATURES = 'features';
const PROP_NAME_MY_COLLECTIONS = 'myCollections';

const ENDPOINTS_CONFIG = {
  '/ds/lux/stats.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    allowInReadOnlyMode: true,
    features: { myCollections: false },
  },
  '/ds/myLux/createSet.mjs': {
    executeAsServiceAccountWhenSpecified: false,
    allowInReadOnlyMode: false,
    features: { myCollections: true },
  },
  '/ds/myLux/readSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    allowInReadOnlyMode: true,
    features: { myCollections: true },
  },
  '/ds/myLux/downloadSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    allowInReadOnlyMode: true,
    features: { myCollections: true },
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
  PROP_NAME_EXECUTE_AS_SERVICE_ACCOUNT_WHEN_SPECIFIED,
  PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
  PROP_NAME_FEATURES,
  PROP_NAME_MY_COLLECTIONS,
};
