import {
  getCurrentEndpointPath,
  PROP_NAME_AMP_AS_ADMIN,
} from '../config/endpointsConfig.mjs';
import { InternalConfigurationError } from './errorClasses.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';

const propertyIsRequired = true;
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

  mayAmpAsAdmin() {
    return this[PROP_NAME_AMP_AS_ADMIN] === true;
  }

  assertValidConfiguration() {
    this.assertValidPropertyValue(
      PROP_NAME_AMP_AS_ADMIN,
      this[PROP_NAME_AMP_AS_ADMIN],
      propertyIsRequired,
      trueOrFalse,
    );
  }

  assertValidPropertyValue(
    propertyName,
    propertyValue,
    isPropertyRequired,
    allowedValues,
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
          `The ${this.getEndpointPath()} endpoint's configuration for the '${propertyName}' property value is not one of the allowed values`,
        );
      }
    }
  }

  assertPropertyDefined(propertyName, propertyValue) {
    if (isUndefined(propertyValue)) {
      throw new InternalConfigurationError(
        `The ${this.getEndpointPath()} endpoint is missing the '${propertyName}' configuration property.`,
      );
    }
  }
};

export { EndpointConfig };
