// Stub required during deployment, before the generateRelatedListsConfig task
// has a chance to provide the runtime version.
function dummy() {}
export {
  dummy as getRelatedListConfig,
  dummy as getRelatedListKeys,
  dummy as hasRelatedList,
};
