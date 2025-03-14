import { testHelperProxy } from '/test/test-helper.mjs';
import { getCurrentEndpointPath } from '/config/endpointsConfig.mjs';

const LIB = '0100 getCurrentEndpointPath.mjs';
console.log(`${LIB}: starting.`);

const assertions = [
  testHelperProxy.assertEqual(
    '/test/default.xqy',
    getCurrentEndpointPath(),
    'Eek! Why is getCurrentEndpointPath not returning the expected endpoint path?!'
  ),
];

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
