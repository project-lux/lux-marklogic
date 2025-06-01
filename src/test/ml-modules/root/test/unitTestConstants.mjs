/*
 * Constants used exclusively within /src/test
 */

import {
  IDENTIFIERS,
  getLanguageIdentifier,
} from '/lib/identifierConstants.mjs';

const ROLE_NAME_UNIT_TESTER = '%%mlAppName%%-unit-tester';
const ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER =
  '%%mlAppName%%-unit-test-service-account-reader';
const ROLE_NAME_TENANT_ENDPOINT_CONSUMER = '%%mlAppName%%-endpoint-consumer';
const ROLE_NAME_TENANT_READER = '%%mlAppName%%-reader';

const USERNAME_FOR_BONNIE = '%%mlAppName%%-unit-test-bonnie';
const USERNAME_FOR_CLYDE = '%%mlAppName%%-unit-test-clyde';
const USERNAME_FOR_SERVICE_ACCOUNT = '%%mlAppName%%-unit-test-service-account';

// Filenames are relative to a suite's test-data subdir.
const FOO_FILENAME = 'foo.json';
const FOO_URI = `/${FOO_FILENAME}`;

const HMO_FILENAME = 'humanMadeObject.json';
const HMO_URI = `/${HMO_FILENAME}`;

export {
  FOO_FILENAME,
  FOO_URI,
  HMO_FILENAME,
  HMO_URI,
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  ROLE_NAME_TENANT_READER,
  ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER,
  ROLE_NAME_UNIT_TESTER,
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_CLYDE,
  USERNAME_FOR_SERVICE_ACCOUNT,
};
