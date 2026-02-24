/*
 * Remove test modules from the main modules database after they've been
 * copied to the test modules database by resetTestModulesDatabase.
 */

const mainModulesDatabase = '%%tenantModulesDatabase%%';

// Execute deletion in the context of the main modules database
function deleteTestModules() {
  declareUpdate();
  const testModuleUris = cts.uriMatch('/test/*').toArray();
  if (testModuleUris.length === 0) {
    return `No test modules found in the ${mainModulesDatabase} database - nothing to remove.`;
  } else {
    // Remove test modules from main database
    for (const uri of testModuleUris) {
      xdmp.documentDelete(uri);
    }

    return `Removed ${testModuleUris.length} test modules from the ${mainModulesDatabase} database.`;
  }
}

const resultMessage = xdmp.invokeFunction(deleteTestModules, {
  database: xdmp.database(mainModulesDatabase),
});

export default resultMessage;
resultMessage;
