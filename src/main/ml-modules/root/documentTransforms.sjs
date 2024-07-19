function associateDocToDataSlice(content, context) {
  // Get the list of collections and document permission.
  const collections = ['%%mlAppName%%'];
  const permissions = [
    xdmp.permission('%%mlAppName%%-writer', 'update'),
    xdmp.permission('%%mlAppName%%-reader', 'read'),
  ];
  const allowedSliceNames = '%%allowedSliceNames%%'.split(',');
  content.value
    .xpath('admin/sources')
    .toArray()
    .forEach((name) => {
      if (allowedSliceNames.includes(name)) {
        name = (name + '').toLowerCase();
        collections.push(name);
        permissions.push(
          xdmp.permission(`%%mlAppName%%-${name}-reader`, 'read')
        );
      } else {
        console.info(
          `Ignoring '${name}' source, because it is not in the list of allowed slice names: '%%allowedSliceNames%%'`
        );
      }
    });

  // Add to MLCP-specified collections.
  context.collections = Array.isArray(context.collections)
    ? context.collections.concat(collections)
    : collections;
  // Override the MLCP-specified permissions.
  context.permissions = permissions;

  return content;
}

exports.associateDocToDataSlice = associateDocToDataSlice;
