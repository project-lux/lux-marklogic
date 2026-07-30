declareUpdate()
/*
 * Mark documents for export. To be used in QC along with get-dataset.js
*/
const uris = [
// paste huge list of URIs here
];
const tempCollection = "export";
const errors = [];
for (const uri of uris) {
  try{
  xdmp.documentAddCollections(uri, tempCollection);
  }
  catch(e){
    errors.push(e)
  }
}

export default errors;