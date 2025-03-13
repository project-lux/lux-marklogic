import { testHelperProxy } from '/test/test-helper.mjs';
import { handleRequest } from '/lib/securityLib.mjs';

const assertions = [];

// Verify handleRequest returns the value from the given function.
const f = () => {
  return 5 + 5;
};
assertions.push(
  testHelperProxy.assertEqual(
    10,
    handleRequest(f),
    'handleRequest did not return the value of the given function'
  )
);

assertions;
