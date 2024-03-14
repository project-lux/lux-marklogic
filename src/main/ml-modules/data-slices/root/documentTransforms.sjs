function associateDocToDataSlice(content, context) {
  // Get the list of collections and document permission.
  const collections = ['lux'];
  const permissions = [
    xdmp.permission('lux-writer', 'update'), // Role from main project.
    xdmp.permission('data-lux', 'read'),
  ];
  content.value
    .xpath('slices')
    .toArray()
    .forEach((name) => {
      name = (name + '').toLowerCase();
      collections.push(name);
      permissions.push(xdmp.permission(`data-${name}`, 'read'));
    });

  // Add to MLCP-specified collections.
  context.collections = Array.isArray(context.collections)
    ? context.collections.concat(collections)
    : collections;
  // Override the MLCP-specified permissions.
  context.permissions = permissions;

  console.log(
    `Updated collections for ${content.uri}: ${context.collections.join(', ')}`
  );
  console.log(
    `Updated permissions for ${content.uri}: ${context.permissions.join(', ')}`
  );

  return content;
}

exports.associateDocToDataSlice = associateDocToDataSlice;
