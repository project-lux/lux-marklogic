declareUpdate();

const schematron = require('/MarkLogic/schematron/schematron.xqy');

function getSchematrons() {
  let schematrons = cts.uris(
    null,
    null,
    cts.directoryQuery('/schematron/', 'infinity')
  );
  return schematrons;
}

function putSchematrons() {
  const params = {
    phase: '#ALL',
    terminate: false,
    'generate-fired-rule': true,
    'generate-paths': true,
    diagnose: true,
    'allow-foreign': false,
    'validate-schema': true,
  };

  let schematrons = xdmp.invokeFunction(getSchematrons, {
    database: xdmp.schemaDatabase(xdmp.database()),
  });

  schematrons.toArray().forEach((uri) => {
    xdmp.log('Putting Schematron: ' + uri);
    schematron.put(uri, params);
  });

  return 'Success';
}

try {
  console.log('SUCCESS');
  putSchematrons();
} catch (e) {
  console.log('FAIL');
  e.message;
}
