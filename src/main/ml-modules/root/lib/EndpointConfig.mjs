import {
  getCurrentEndpointPath,
  PROP_NAME_EXECUTE_AS_SERVICE_ACCOUNT_WHEN_SPECIFIED,
  PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
  PROP_NAME_FEATURES,
  PROP_NAME_MY_COLLECTIONS,
} from '../config/endpointsConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';

const EndpointConfig = class {
  constructor(endpointConfig) {
    Object.keys(endpointConfig).forEach((key) => {
      this[key] = endpointConfig[key];
    });
    this.endpointPath = getCurrentEndpointPath();
    assertValidConfiguration(this);
  }

  getEndpointPath() {
    return this.endpointPath;
  }

  // TODO: decide if we're going to use this.
  isServiceAccountApplicable() {
    return this[PROP_NAME_EXECUTE_AS_SERVICE_ACCOUNT_WHEN_SPECIFIED] === true;
  }

  mayExecuteInReadOnlyMode() {
    return this[PROP_NAME_ALLOW_IN_READ_ONLY_MODE] === true;
  }

  mayNotExecuteInReadOnlyMode() {
    return !this.mayExecuteInReadOnlyMode();
  }

  isPartOfMyCollectionsFeature() {
    return this[PROP_NAME_FEATURES][PROP_NAME_MY_COLLECTIONS] === true;
  }
};

/*
 * A runtime check against the requested endpoint's configuration. An error is thrown when the
 * configuration is invalid. Any configuration errors should be caught before reaching PROD.
 */
const propertyIsRequired = true;
const propertyIsNotRequired = false;
const trueOrFalse = [true, false];
function assertValidConfiguration(endpointConfig) {
  // TODO: decide if we're going to use this.
  assertValidPropertyValue(
    endpointConfig,
    PROP_NAME_EXECUTE_AS_SERVICE_ACCOUNT_WHEN_SPECIFIED,
    propertyIsRequired,
    trueOrFalse
  );
  assertValidPropertyValue(
    endpointConfig,
    PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
    propertyIsRequired,
    trueOrFalse
  );
  assertValidPropertyValueType(
    endpointConfig,
    PROP_NAME_FEATURES,
    propertyIsRequired,
    'object'
  );
  assertValidPropertyValue(
    endpointConfig.features,
    PROP_NAME_MY_COLLECTIONS,
    propertyIsRequired,
    trueOrFalse
  );
}

function assertValidPropertyValue(
  endpointConfig,
  propertyName,
  isPropertyRequired,
  allowedValues
) {
  if (isPropertyRequired) {
    assertPropertyDefined(endpointConfig, propertyName);
  }
  if (isPropertyRequired || (!isPropertyRequired && isDefined(value))) {
    if (!allowedValues.includes(endpointConfig[propertyName])) {
      throw new InternalConfigurationError(
        `The ${endpointConfig.getEndpointPath()} endpoint's configuration for the '${propertyName}' property is invalid`
      );
    }
  }
}

function assertValidPropertyValueType(
  endpointConfig,
  propertyName,
  isPropertyRequired,
  valueType
) {
  const value = endpointConfig[propertyName];
  if (isPropertyRequired) {
    assertPropertyDefined(endpointConfig, propertyName);
  }
  if (isPropertyRequired || (!isPropertyRequired && isDefined(value))) {
    if (typeof value !== valueType) {
      throw new InternalConfigurationError(
        `The ${endpointConfig.getEndpointPath()} endpoint's configuration for the '${propertyName}' property value is invalid`
      );
    }
  }
}

function assertPropertyDefined(endpointConfig, propertyName) {
  if (isUndefined(endpointConfig[propertyName])) {
    throw new InternalConfigurationError(
      `The ${endpointConfig.getEndpointPath()} endpoint is missing the '${propertyName}' configuration property.`
    );
  }
}

export { EndpointConfig };
