/*
 * Error class extensions defined herein are intended to be thrown by code needing to halt the request.
 * When allowed to reach the app server's custom error handler, the error handlers uses the error's
 * class name to determine the response's status code and status message.  Only the class name and
 * message reach the error handler.
 */
// Helps non-search endpoints decide whether to log they failed.
const INVALID_SEARCH_REQUEST_LABEL = 'Invalid search request';

class AccessDeniedError extends Error {
  constructor(message) {
    super(message);
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message);
  }
}

class DataMergeError extends Error {
  constructor(message) {
    super(message);
  }
}

class InternalConfigurationError extends Error {
  constructor(message) {
    super(message);
  }
}

class InternalServerError extends Error {
  constructor(message) {
    super(message);
  }
}

class InvalidSearchRequestError extends Error {
  constructor(message) {
    super(`${INVALID_SEARCH_REQUEST_LABEL}: ${message}`);
  }
}

class LoopDetectedError extends Error {
  constructor(message) {
    super(message);
  }
}
class NotAcceptingWriteRequestsError extends Error {
  constructor(message) {
    super(message);
  }
}
class NotFoundError extends Error {
  constructor(message) {
    super(message);
  }
}

class NotImplementedError extends Error {
  constructor(message) {
    super(message);
  }
}

class ServerConfigurationChangedError extends Error {
  constructor(message) {
    super(message);
  }
}

// Because e.name isn't InvalidSearchRequestError within a catch block :(
function isInvalidSearchRequestError(e) {
  return e.message && e.message.includes(INVALID_SEARCH_REQUEST_LABEL);
}

export {
  AccessDeniedError,
  BadRequestError,
  DataMergeError,
  InternalConfigurationError,
  InternalServerError,
  InvalidSearchRequestError,
  LoopDetectedError,
  NotAcceptingWriteRequestsError,
  NotFoundError,
  NotImplementedError,
  ServerConfigurationChangedError,
  isInvalidSearchRequestError,
};
