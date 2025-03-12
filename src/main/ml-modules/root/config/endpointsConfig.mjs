import { EndpointConfig } from '../lib/EndpointConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const PROP_NAME_ALLOW_IN_READ_ONLY_MODE = 'allowInReadOnlyMode';
const PROP_NAME_FEATURES = 'features';
const PROP_NAME_MY_COLLECTIONS = 'myCollections';

const ENDPOINTS_CONFIG = {
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
