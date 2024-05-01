function associateDocToDataSlice(content, context) {
  // Get the list of collections and document permission.
  const collections = ['lux-by-unit'];
  const permissions = [
    xdmp.permission('lux-by-unit-writer', 'update'),
    xdmp.permission('lux-by-unit-reader', 'read'),
  ];
  content.value
    .xpath('admin/sources')
    .toArray()
    .forEach((name) => {
      name = (name + '').toLowerCase();
      collections.push(name);
      permissions.push(xdmp.permission(`${name}-reader`, 'read'));
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
