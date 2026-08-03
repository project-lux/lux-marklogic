function associateDocToDataSlice(context, params, content)  {
  // Get the list of collections and document permission.
  const collections = ['lux'];
  const permissions = [
    xdmp.permission('lux-writer', 'update'),
    xdmp.permission('lux-reader', 'read'),
  ];
  content.xpath('admin/sources')
    .toArray()
    .forEach((name) => {
      name = (name + '').toLowerCase();
      collections.push(name);
      permissions.push(xdmp.permission(`lux-${name}-reader`, 'read'));
    });

  // Add to MLCP-specified collections.
  context.collections = Array.isArray(context.collections)
    ? context.collections.concat(collections)
    : collections;
  // Override the MLCP-specified permissions.
  context.permissions = permissions;

  return content;
}

exports.transform = associateDocToDataSlice;