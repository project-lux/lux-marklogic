import { getCurrentEndpointPath } from '../config/endpointsConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';

const EndpointConfig = class {
  constructor(endpointConfig) {
    Object.keys(endpointConfig).forEach((key) => {
      this[key] = endpointConfig[key];
    });
    this.entityPath = getCurrentEndpointPath();
    assertValidConfiguration(this);
  }

  getEntityPath() {
    return this.entityPath;
  }

  // isServiceAccountApplicable() {
  //   return this.executeAsServiceAccountWhenSpecified === true;
  // }

  // hasReceivingFunctionForServiceAccount() {
  //   return isDefined(this.receivingServiceAccountFunction);
  // }

  // getReceivingFunctionForServiceAccount() {
  //   return this.receivingServiceAccountFunction;
  // }
};

/*
 * A runtime check against the requested endpoint's configuration. An error is thrown when the
 * configuration is invalid. Any configuration errors should be caught before reaching PROD.
 */
const propertyIsRequired = true;
const propertyIsNotRequired = false;
function assertValidConfiguration(endpointConfig) {
  // TODO: Replace with tests for the features and allowInReadOnlyMode properties.
  // TBD whether we retain the executeAsServiceAccountWhenSpecified property.
  //
  // assertValidPropertyValue(
  //   endpointConfig,
  //   'executeAsServiceAccountWhenSpecified',
  //   propertyIsRequired,
  //   [true, false]
  // );
  // assertValidPropertyValueType(
  //   endpointConfig,
  //   'receivingServiceAccountFunction',
  //   propertyIsNotRequired,
  //   'function'
  // );
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
        `The ${endpointConfig.getEntityPath()} endpoint's configuration for the '${propertyName}' property is invalid`
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
  console.log(
    `assertValidPropertyValueType: ${propertyName} defined ?= ${isDefined(
      value
    )}`
  );
  if (isPropertyRequired || (!isPropertyRequired && isDefined(value))) {
    if (typeof value !== valueType) {
      throw new InternalConfigurationError(
        `The ${endpointConfig.getEntityPath()} endpoint's configuration for the '${propertyName}' property value is invalid`
      );
    }
  }
}

function assertPropertyDefined(endpointConfig, propertyName) {
  if (isUndefined(endpointConfig[propertyName])) {
    throw new InternalConfigurationError(
      `The ${endpointConfig.getEntityPath()} endpoint is missing the '${propertyName}' configuration property.`
    );
  }
}

export { EndpointConfig };
