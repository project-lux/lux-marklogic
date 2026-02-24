/**
 * Reset the unit test modules database by clearing it and copying all documents
 * from the main modules database, maintaining document permissions.
 */

const sourceDatabaseName = '%%tenantModulesDatabase%%';
const targetDatabaseName = '%%tenantTestModulesDatabase%%';

let resultMessage = null;

try {
  // First, clear the target database
  console.log(`Clearing database: ${targetDatabaseName}`);

  const targetDbId = xdmp.database(targetDatabaseName);
  const allUrisInTarget = xdmp
    .eval('cts.uris()', {}, { database: targetDbId })
    .toArray();
  console.log(`Found ${allUrisInTarget.length} docs in target database`);

  if (allUrisInTarget && allUrisInTarget.length > 0) {
    const deletedCount = fn.head(
      xdmp.eval(
        `
        declareUpdate();
        let deletedCount = 0;
        for (const uri of external.uris) {
          if (fn.docAvailable(uri)) {
            xdmp.documentDelete(uri);
            deletedCount++;
          }
        }
        export default deletedCount;
        deletedCount;
      `,
        { uris: allUrisInTarget },
        { database: targetDbId },
      ),
    );
    console.log(
      `Deleted ${deletedCount} of ${allUrisInTarget.length} documents from ${targetDatabaseName}`,
    );
  } else {
    console.log(`No documents to delete from ${targetDatabaseName}`);
  }

  // Now copy all documents from source to target
  console.log(`Collecting documents from ${sourceDatabaseName}...`);

  const sourceDbId = xdmp.database(sourceDatabaseName);
  const allUrisInSource = xdmp
    .eval('cts.uris()', {}, { database: sourceDbId })
    .toArray();
  console.log(`Found ${allUrisInSource.length} docs in source database`);

  if (allUrisInSource && allUrisInSource.length > 0) {
    // Get all documents and their metadata from source database
    const allDocData = fn.head(
      xdmp.eval(
        `
        const documentsData = [];
        for (const uri of external.uris) {
          if (fn.docAvailable(uri)) {
            documentsData.push({
              uri: uri,
              document: fn.doc(uri),
              permissions: xdmp.documentGetPermissions(uri),
              collections: xdmp.documentGetCollections(uri),
              metadata: xdmp.documentGetMetadata(uri),
              quality: xdmp.documentGetQuality(uri)
            });
          }
        }
        export default documentsData;
        documentsData;
      `,
        { uris: allUrisInSource },
        { database: sourceDbId },
      ),
    );

    // Insert all documents into target database
    if (allDocData && allDocData.length > 0) {
      console.log(
        `Inserting ${allDocData.length} documents into ${targetDatabaseName}...`,
      );
      const insertedCount = fn.head(
        xdmp.eval(
          `
          declareUpdate();
          let insertedCount = 0;
          for (const docInfo of external.allDocData) {
            xdmp.documentInsert(
              docInfo.uri,
              docInfo.document,
              {
                permissions: docInfo.permissions,
                collections: docInfo.collections,
                metadata: docInfo.metadata,
                quality: docInfo.quality
              }
            );
            insertedCount++;
          }
          export default insertedCount;
          insertedCount;
        `,
          { allDocData: allDocData },
          { database: targetDbId },
        ),
      );
      resultMessage = `Reset ${targetDatabaseName} with ${insertedCount} of ${allDocData.length} documents from ${sourceDatabaseName}`;
    } else {
      resultMessage = `No documents found to copy from ${sourceDatabaseName}`;
    }
  } else {
    resultMessage = `No documents found in ${sourceDatabaseName}`;
  }
} catch (error) {
  console.error(
    `Error encountered while resetting the ${targetDatabaseName} database: `,
    error,
  );
  throw error;
}
console.log(resultMessage);
export default resultMessage;
resultMessage;
