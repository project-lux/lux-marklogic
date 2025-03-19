declareUpdate();

import { testHelperProxy } from '/test/test-helper.mjs';

import {
  ROLE_NAME_TENANT_READER,
  ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER,
  ROLE_NAME_UNIT_TESTER,
} from '/lib/appConstants.mjs';

import { FOO_FILENAME, FOO_URI } from '/unitTestConstants.mjs';

console.log(`Creating ${FOO_URI}`);

try {
  // loadTestFile does not accept the return from xdmp.permission.
  const permissionNodes = fn
    .head(
      xdmp.unquote(
        `<root><sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>read</sec:capability>
        <sec:role-id>${xdmp.role(ROLE_NAME_UNIT_TESTER)}</sec:role-id>
      </sec:permission>
      <sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>update</sec:capability>
        <sec:role-id>${xdmp.role(ROLE_NAME_UNIT_TESTER)}</sec:role-id>
      </sec:permission>
      <sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>read</sec:capability>
        <sec:role-id>${xdmp.role(ROLE_NAME_TENANT_READER)}</sec:role-id>
      </sec:permission>
      <sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>read</sec:capability>
        <sec:role-id>${xdmp.role(
          ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER
        )}</sec:role-id>
      </sec:permission></root>`
      )
    )
    .xpath('./root/*');

  testHelperProxy.loadTestFile(
    FOO_FILENAME,
    xdmp.database(),
    FOO_URI,
    permissionNodes
  );
} catch (e) {
  console.error(`Unable to create ${FOO_URI}`);
  console.error(e.message);
  console.error(e.stack);
}
