function applyDataSliceConfiguration(content, context) {
  // Get the list of collections and document permission.
  const collections = ['lux'];
  const permissions = [xdmp.permission('embedded-triples-lux', 'read')]; // TODO: add lux-writer.
  content.value
    .xpath('slices')
    .toArray()
    .forEach((name) => {
      name = (name + '').toLowerCase();
      collections.push(name);
      permissions.push(xdmp.permission(`embedded-triples-${name}`, 'read'));
    });

  // Overwrite the defaults specified to MLCP.
  context.collections = collections;
  context.permissions = permissions;

  console.log(
    `Updated collections for ${content.uri}: ${context.collections.join(', ')}`
  );
  console.log(
    `Updated permissions for ${content.uri}: ${context.permissions.join(', ')}`
  );

  return content;
}

exports.applyDataSliceConfiguration = applyDataSliceConfiguration;
