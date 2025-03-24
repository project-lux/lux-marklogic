import {
  getCurrentEndpointPath,
  PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
  PROP_NAME_FEATURES,
  PROP_NAME_MY_COLLECTIONS,
} from '../config/endpointsConfig.mjs';
import { InternalConfigurationError } from '../lib/mlErrorsLib.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';

const propertyIsRequired = true;
// const propertyIsNotRequired = false;
const trueOrFalse = [true, false];

/*
 * An error is thrown when the endpoint is not configured as expected.
 */
const EndpointConfig = class {
  constructor(endpointConfigJson) {
    Object.keys(endpointConfigJson).forEach((key) => {
      this[key] = endpointConfigJson[key];
    });
    this.endpointPath = getCurrentEndpointPath();
    this.assertValidConfiguration();
  }

  getEndpointPath() {
    return this.endpointPath;
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

  assertValidConfiguration() {
    this.assertValidPropertyValue(
      PROP_NAME_ALLOW_IN_READ_ONLY_MODE,
      this[PROP_NAME_ALLOW_IN_READ_ONLY_MODE],
      propertyIsRequired,
      trueOrFalse
    );
    this.assertValidPropertyValueType(
      PROP_NAME_FEATURES,
      this[PROP_NAME_FEATURES],
      propertyIsRequired,
      'object'
    );
    this.assertValidPropertyValue(
      PROP_NAME_MY_COLLECTIONS,
      this[PROP_NAME_FEATURES][PROP_NAME_MY_COLLECTIONS],
      propertyIsRequired,
      trueOrFalse
    );
  }

  assertValidPropertyValue(
    propertyName,
    propertyValue,
    isPropertyRequired,
    allowedValues
  ) {
    if (isPropertyRequired) {
      this.assertPropertyDefined(propertyName, propertyValue);
    }
    if (
      isPropertyRequired ||
      (!isPropertyRequired && isDefined(propertyValue))
    ) {
      if (!allowedValues.includes(propertyValue)) {
        throw new InternalConfigurationError(
          `The ${this.getEndpointPath()} endpoint's configuration for the '${propertyName}' property value is not one of the allowed values`
        );
      }
    }
  }

  assertValidPropertyValueType(
    propertyName,
    propertyValue,
    isPropertyRequired,
    valueType
  ) {
    if (isPropertyRequired) {
      this.assertPropertyDefined(propertyName, propertyValue);
    }
    if (
      isPropertyRequired ||
      (!isPropertyRequired && isDefined(propertyValue))
    ) {
      if (typeof propertyValue !== valueType) {
        throw new InternalConfigurationError(
          `The ${this.getEndpointPath()} endpoint's configuration for the '${propertyName}' property value has the wrong value type`
        );
      }
    }
  }

  assertPropertyDefined(propertyName, propertyValue) {
    if (isUndefined(propertyValue)) {
      throw new InternalConfigurationError(
        `The ${this.getEndpointPath()} endpoint is missing the '${propertyName}' configuration property.`
      );
    }
  }
};

export { EndpointConfig };
