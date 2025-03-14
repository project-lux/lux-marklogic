declareUpdate();

import { testHelperProxy } from '/test/test-helper.mjs';

// TODO: define in a single file?
const filename = 'foo.json'; // relative to ./test-data
const uri = `/${filename}`;

console.log(`Creating ${uri}`);

try {
  // loadTestFile does not accept the return from xdmp.permission.
  const permissionNodes = fn
    .head(
      xdmp.unquote(
        `<root><sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>update</sec:capability>
        <sec:role-id>10576052877543247809</sec:role-id>
      </sec:permission>
      <sec:permission xmlns:sec="http://marklogic.com/xdmp/security">
        <sec:capability>read</sec:capability>
        <sec:role-id>6587109290704843331</sec:role-id>
      </sec:permission></root>`
      )
    )
    .xpath('./root/*');

  testHelperProxy.loadTestFile(filename, xdmp.database(), uri, permissionNodes);
} catch (e) {
  console.error(`Unable to create ${uri}`);
  console.error(e.message);
  console.error(e.stack);
}
