function search(serviceAccountName) {
  // TODO: dynamically determine the function name by naming convention.
  if (serviceAccountName == 'lux-endpoint-consumer') {
    console.log("Searching with lux-endpoint-consumer's roles");
    return searchWithLuxEndpointConsumerRole();
  }
  console.log("Searching only with requesting user's roles");
  return _underlyingSearch();
}

// Requires amp to gain lux-endpoint-consumer's roles (including document permissions).
// TODO: generate one of these per endpoint consumer service account.
function _searchWithLuxEndpointConsumerRole() {
  return _underlyingSearch();
}
const searchWithLuxEndpointConsumerRole = import.meta.amp(
  _searchWithLuxEndpointConsumerRole
);

// _searchWith*EndpointConsumerRole to use this.
function _underlyingSearch() {
  const responseBody = {
    username: xdmp.getCurrentUser(),
    roles: xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      }),
    uris: fn
      .subsequence(
        cts.search(
          cts.documentQuery([
            'https://lux.collections.yale.edu/data/set/00124abe-cf15-4497-94fb-a4ec4276bbe8',
            'https://lux.collections.yale.edu/data/set/6p3dia4a-cf15-4497-94fb-a4ec4276bbe8.json',
          ])
        ),
        1,
        10
      )
      .toArray()
      .map((doc) => {
        return doc.baseURI;
      }),
  };
  responseBody.length = responseBody.uris.length;
  return responseBody;
}

export { search };
