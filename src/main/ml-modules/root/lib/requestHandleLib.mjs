/*
 * While revamping error handling to be more consistent, this file was gutted.  Elected to continue
 * having all data service requests go through here as we may want some common functionality.  Ideas:
 *
 * 1. Enable point-in-time queries with a rolling window of time.
 * 2. Use the same unique request ID in the request and error logs.
 *
 */
function handleRequest(f) {
  return f();
}

export { handleRequest };
