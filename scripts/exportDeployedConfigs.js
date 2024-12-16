/*
 * This script may be used to create a zip of deployed (fully generated)
 * configuration files.  This could be repurposed or further parameterized to
 * create a zip of other modules/documents from a modules or content database.
 *
 * Usage: paste into QC, modify filename to match a valid path on your host machine, set the database to a LUX content database, and execute.
 */
'use strict';

/*
 * START: Configuration and additional imports.
 */
import { CODE_VERSION } from '/lib/appConstants.mjs'; // only used in filename.

const uriPattern = '/config/*';
const filename = `/host/tmp/lux-config-${CODE_VERSION}.zip`;
/*
 * END: Configuration and additional imports.
 */

const evalInModulesDatabase = (javascript, vars = {}, update = false) => {
  return xdmp.eval(javascript, vars, {
    database: xdmp.modulesDatabase(),
    update: update + '',
  });
};

const javascript = `
  const cvt = require('/MarkLogic/conversion/convert.xqy');
  const manifest = [];
  const docs = [];
  cts.uriMatch('${uriPattern}').toArray().forEach((uri) => {
    if(cvt.basename(uri) !== ''){
      manifest.push({ path: cvt.basename(uri) });
      docs.push(cts.doc(uri));
    }
  });
  xdmp.save('${filename}', xdmp.zipCreate(manifest, docs));
`;
evalInModulesDatabase(javascript);

`Compressed ${uriPattern} into ${filename}`;
