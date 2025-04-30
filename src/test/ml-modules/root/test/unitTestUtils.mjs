import { testHelperProxy } from '/test/test-helper.mjs';
import { getExclusiveRoleNamesByUsername } from '/lib/securityLib.mjs';

const sec = require('/MarkLogic/security.xqy');

/**
 * Invoke a zero arity function whereby the scenario may expect an error.  This utility handles the
 * error handling portion of the checks.  When it returns a value (vs. throws), the function behaved
 * as expected with regard to whether it was supposed to (or not supposed to) throw an error.
 *
 * @param {Object} scenario is to define name, expected.error, and --when expected.error is true--
 *    expected.stackToInclude.
 * @param {Function} zeroArityFun is the function to be invoked.  It must be zero arity.
 * @param {Object} invokeFunOptions is the options to be passed to the xdmp.invokeFunction call.
 * @returns object with the following top-level properties: actualValue, applyErrorNotExpectedAssertions,
 *    assertions.
 */
function executeErrorSupportedScenario(
  scenario,
  zeroArityFun,
  invokeFunOptions = {}
) {
  console.log(`Processing scenario '${scenario.name}'`);
  let actualValue;
  let errorExpectedButNotThrown = false;
  let applyErrorNotExpectedAssertions = false;
  const errorExpected = scenario.expected.error === true;
  const assertions = [];
  try {
    actualValue = fn.head(xdmp.invokeFunction(zeroArityFun, invokeFunOptions));
    // Better to do all of the asserts outside the try/catch.
    if (errorExpected) {
      errorExpectedButNotThrown = true;
    } else {
      applyErrorNotExpectedAssertions = true;
    }
  } catch (e) {
    if (!errorExpected) {
      const msg = `Scenario '${scenario.name}' resulted in an error when one was NOT expected; e.message: '${e.message}'; see log for the stacktrace`;
      console.log(msg);
      console.log(e.stack);
      fn.error(xs.QName('ASSERT-THROWS-ERROR-FAILED'), msg);
    }

    // See if the expected error includes the expected text.
    const msg = `Scenario '${scenario.name}' error stacktrace does not include "${scenario.expected.stackToInclude}"; see log for the stacktrace`;
    const idx = e.stack.indexOf(scenario.expected.stackToInclude);
    if (idx == -1) {
      console.log(msg);
      console.log(e.stack);
    }
    assertions.push(testHelperProxy.assertNotEqual(-1, idx, msg));
  }

  if (errorExpectedButNotThrown) {
    fn.error(
      xs.QName('ASSERT-THROWS-ERROR-FAILED'),
      `Scenario '${scenario.name}' didn't result in an error when one was expected.`
    );
  }

  // Ya get a point for not throwing an error, given one wasn't expected.
  if (applyErrorNotExpectedAssertions) {
    assertions.push(testHelperProxy.success());
  }

  return {
    actualValue,
    applyErrorNotExpectedAssertions,
    assertions,
  };
}

// Call this before deleting the user's roles that could be on the documents in the specified collections.
function removeCollections(collections, username) {
  const zeroArityFun = () => {
    declareUpdate();
    collections.forEach((name) => {
      console.log(
        `User ${xdmp.getCurrentUser()} is attempting to delete the '${name}' collection from the ${xdmp.databaseName(
          xdmp.database()
        )} database...`
      );
      xdmp.collectionDelete(name);
    });
  };
  xdmp.invokeFunction(zeroArityFun, { userId: xdmp.user(username) });
}

function removeExclusiveRolesByUsername(username) {
  const zeroArityFun = () => {
    declareUpdate();
    getExclusiveRoleNamesByUsername(username).forEach((roleName) => {
      if (sec.roleExists(roleName)) {
        console.log(`Deleting the ${roleName} role...`);
        sec.removeRole(roleName);
      }
    });
  };
  xdmp.invokeFunction(zeroArityFun, { database: xdmp.securityDatabase() });
}

export {
  executeErrorSupportedScenario,
  removeCollections,
  removeExclusiveRolesByUsername,
};
