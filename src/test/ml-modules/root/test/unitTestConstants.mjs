/*
 * Constants used exclusively within /src/test
 */

const ROLE_NAME_UNIT_TESTER = '%%mlAppName%%-unit-tester';
const ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER =
  '%%mlAppName%%-unit-test-service-account-reader';
const ROLE_NAME_TENANT_ENDPOINT_CONSUMER = '%%mlAppName%%-endpoint-consumer';
const ROLE_NAME_TENANT_READER = '%%mlAppName%%-reader';

const USERNAME_FOR_BONNIE = '%%mlAppName%%-unit-test-bonnie';
const USERNAME_FOR_CLYDE = '%%mlAppName%%-unit-test-clyde';
const USERNAME_FOR_DEPLOYER = '%%mlAppName%%-unit-test-deployer';
const USERNAME_FOR_SERVICE_ACCOUNT = '%%mlAppName%%-unit-test-service-account';

// Filenames are relative to a suite's test-data subdir.
const ANN_TOP_K_SEED_FILENAME = 'annTopKSeed.json';
const ANN_TOP_K_SEED_URI = `/${ANN_TOP_K_SEED_FILENAME}`;

const FACET_CURATOR_FILENAME = 'facetCurator.json';
const FACET_CURATOR_URI =
  'https://lux.collections.yale.edu/data/group/test-facet-curator';
const FACET_ITEM_FILENAME = 'facetItem.json';
const FACET_ITEM_URI =
  'https://lux.collections.yale.edu/data/object/test-facet-item';
const FACET_SET_FILENAME = 'facetSet.json';
const FACET_SET_URI =
  'https://lux.collections.yale.edu/data/set/test-facet-set';

const SORT_ITEM_WITH_VALUE_1_FILENAME = 'sortItemWithValue1.json';
const SORT_ITEM_WITH_VALUE_1_URI =
  'https://lux.collections.yale.edu/data/object/test-sort-with-value-1';
const SORT_ITEM_WITH_VALUE_2_FILENAME = 'sortItemWithValue2.json';
const SORT_ITEM_WITH_VALUE_2_URI =
  'https://lux.collections.yale.edu/data/object/test-sort-with-value-2';
const SORT_ITEM_MULTI_VALUE_FILENAME = 'sortItemMultiValue.json';
const SORT_ITEM_MULTI_VALUE_URI =
  'https://lux.collections.yale.edu/data/object/test-sort-multi-value';
const SORT_ITEM_NO_VALUE_1_FILENAME = 'sortItemNoValue1.json';
const SORT_ITEM_NO_VALUE_1_URI =
  'https://lux.collections.yale.edu/data/object/test-sort-no-value-1';
const SORT_ITEM_NO_VALUE_2_FILENAME = 'sortItemNoValue2.json';
const SORT_ITEM_NO_VALUE_2_URI =
  'https://lux.collections.yale.edu/data/object/test-sort-no-value-2';
const SORT_SET_FILENAME = 'sortSet.json';
const SORT_SET_URI = 'https://lux.collections.yale.edu/data/set/test-sort-set';

const FOO_FILENAME = 'foo.json';
const FOO_URI = `/${FOO_FILENAME}`;

const HMO_FILENAME = 'humanMadeObject.json';
const HMO_URI = `/${HMO_FILENAME}`;

export {
  ANN_TOP_K_SEED_FILENAME,
  ANN_TOP_K_SEED_URI,
  FACET_CURATOR_FILENAME,
  FACET_CURATOR_URI,
  FACET_ITEM_FILENAME,
  FACET_ITEM_URI,
  FACET_SET_FILENAME,
  FACET_SET_URI,
  FOO_FILENAME,
  FOO_URI,
  HMO_FILENAME,
  HMO_URI,
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  ROLE_NAME_TENANT_READER,
  ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER,
  ROLE_NAME_UNIT_TESTER,
  SORT_ITEM_NO_VALUE_1_FILENAME,
  SORT_ITEM_NO_VALUE_1_URI,
  SORT_ITEM_NO_VALUE_2_FILENAME,
  SORT_ITEM_NO_VALUE_2_URI,
  SORT_ITEM_MULTI_VALUE_FILENAME,
  SORT_ITEM_MULTI_VALUE_URI,
  SORT_SET_FILENAME,
  SORT_SET_URI,
  SORT_ITEM_WITH_VALUE_1_FILENAME,
  SORT_ITEM_WITH_VALUE_1_URI,
  SORT_ITEM_WITH_VALUE_2_FILENAME,
  SORT_ITEM_WITH_VALUE_2_URI,
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_CLYDE,
  USERNAME_FOR_DEPLOYER,
  USERNAME_FOR_SERVICE_ACCOUNT,
};
