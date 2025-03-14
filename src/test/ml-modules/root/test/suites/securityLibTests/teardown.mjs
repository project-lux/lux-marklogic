declareUpdate();

// TODO: define in a single file?
const filename = 'foo.json'; // relative to ./test-data
const uri = `/${filename}`;

if (fn.docAvailable(uri)) {
  console.log(`Deleting '${uri}'`);
  xdmp.documentDelete(uri);
}
