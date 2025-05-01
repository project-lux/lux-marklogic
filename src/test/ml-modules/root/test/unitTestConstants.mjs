/*
 * Constants used exclusively within /src/test
 */

const ROLE_NAME_UNIT_TESTER = '%%mlAppName%%-unit-tester';
const ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER =
  '%%mlAppName%%-unit-test-service-account-reader';
const ROLE_NAME_TENANT_ENDPOINT_CONSUMER = '%%mlAppName%%-endpoint-consumer';
const ROLE_NAME_TENANT_READER = '%%mlAppName%%-reader';

const USERNAME_FOR_REGULAR_USER = '%%mlAppName%%-unit-test-regular-user';
const USERNAME_FOR_SERVICE_ACCOUNT = '%%mlAppName%%-unit-test-service-account';
const FOO_FILENAME = 'foo.json'; // relative to ./test-data
const FOO_URI = `/${FOO_FILENAME}`;

export {
  FOO_FILENAME,
  FOO_URI,
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  ROLE_NAME_TENANT_READER,
  ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER,
  ROLE_NAME_UNIT_TESTER,
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
};
