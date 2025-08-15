import { testHelperProxy } from '/test/test-helper.mjs';
import { getCurrentEndpointPath } from '/config/endpointsConfig.mjs';
import { UNIT_TEST_ENDPOINT } from '/lib/appConstants.mjs';

const LIB = '0100 getCurrentEndpointPath.mjs';
console.log(`${LIB}: starting.`);

const assertions = [
  testHelperProxy.assertEqual(
    UNIT_TEST_ENDPOINT,
    getCurrentEndpointPath(),
    'Eek! Why is getCurrentEndpointPath not returning the expected endpoint path?!'
  ),
];

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
