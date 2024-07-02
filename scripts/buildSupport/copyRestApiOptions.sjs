const copyRestApiOptions = () => {
  const sourceUris = [
    '/Default/%%mlAppName%%-request-group-1/rest-api/options/lux-options.xml',
    '/Default/%%mlAppName%%-request-group-1/rest-api/properties.xml',
  ];

  const messages = [];
  sourceUris.forEach((sourceUri) => {
    if (fn.docAvailable(sourceUri)) {
      const targetUri = sourceUri.replace('group-1', 'group-2');
      if (sourceUri == targetUri) {
        fn.error(
          xs.QName('DEPLOYMENT_ERROR'),
          `Source and target URIs are the same: '${sourceUri}'`
        );
      }

      xdmp.documentInsert(
        targetUri,
        fn.head(cts.doc(sourceUri)),
        xdmp.documentGetPermissions(sourceUri),
        xdmp.documentGetCollections(sourceUri)
      );

      messages.push(`Copied '${sourceUri}' to '${targetUri}'`);
    } else {
      fn.error(
        xs.QName('DEPLOYMENT_ERROR'),
        `Unable to copy '${sourceUri}' as it does not exist.`
      );
    }
  });

  return messages.join('\n');
};

xdmp.invokeFunction(copyRestApiOptions, {
  database: xdmp.database('%%tenantModulesDatabase%%'),
  update: 'true',
});
