import { testHelperProxy } from '/test/test-helper.mjs';
import { getExclusiveRoleNamesByUsername } from '/lib/securityLib.mjs';
import { isArray, toArray } from '/utils/utils.mjs';

const sec = require('/MarkLogic/security.xqy');

/**
 * Invoke a zero arity function configured by the provided scenario.
 *
 * @param {Object} Properties:
 *    name: Name of scenario.
 *    executeBeforehand: Optional function to execute before the function to test.  Must be zero arity.
 *    expected.error: Boolean indicating whether an error is expected.
 *    expected.stackToInclude: String to look for in the error stack trace; used when error is expected.
 *    expected.nodeAssertions: Optional array of assertions to apply to the result of the function. Only
 *       applicable when the function being tested returns an object, which this function then creates a
 *       node out of and applies the assertions to.  There are three types of assertions: equality, xpath,
 *       and function.  See the implementation for examples and utilized properties of each.
 * @param {Function} zeroArityFun is the function to be tested.  It must be zero arity.
 * @param {Object} invokeFunOptions is the options to be passed to the xdmp.invokeFunction call.
 * @returns object with the following top-level properties: actualValue, applyErrorNotExpectedAssertions,
 *    assertions.
 */
function executeScenario(scenario, zeroArityFun, invokeFunOptions = {}) {
  console.log(`Processing scenario '${scenario.name}'`);
  let actualValue;
  let errorExpectedButNotThrown = false;
  let applyErrorNotExpectedAssertions = false;
  const errorExpected = scenario.expected.error === true;
  const assertions = [];
  try {
    if (scenario.executeBeforehand) {
      scenario.executeBeforehand();
    }
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

    // Let's see if the scenario provided node assertions to apply.
    if (isArray(scenario.expected.nodeAssertions)) {
      const docNode = xdmp.toJSON(actualValue);
      scenario.expected.nodeAssertions.forEach((assertion) => {
        if (assertion.type === 'equality') {
          /*
              {
                type: 'equality',
                xpath: `created_by`,
                expected: existingUserProfile.xpath('json/created_by'),
                message: 'The created_by property was not restored.',
              },
          */
          assertions.push(
            testHelperProxy.assertEqual(
              assertion.expected,
              docNode.xpath(assertion.xpath),
              assertion.message
            )
          );
        } else if (assertion.type === 'xpath') {
          /*
              {
                type: 'xpath',
                xpath: 'exists(id)',
                expected: true,
                message: 'The id property was not added.',
              },
          */
          assertions.push(
            testHelperProxy.assertEqual(
              assertion.expected,
              docNode.xpath(assertion.xpath),
              assertion.message
            )
          );
        } else {
          /*
              { 
                type: 'function', 
                function: (docNode, username) => {
                  return testHelperProxy.assert...
                }
              },
          */
          assertions.push(assertion.function(docNode, scenario.input.username));
        }
      });
    }
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
    toArray(collections).forEach((name) => {
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

export { executeScenario, removeCollections, removeExclusiveRolesByUsername };
