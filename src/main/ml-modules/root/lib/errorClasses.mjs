/*
 * Error class extensions defined herein are intended to be thrown by code needing to halt the request.
 */

// Helps non-search endpoints decide whether to log they failed.
const INVALID_SEARCH_REQUEST_LABEL = 'Invalid search request';

class LuxBaseError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

class AccessDeniedError extends LuxBaseError {
  constructor(message) {
    super(message, 403);
  }
}

class BadRequestError extends LuxBaseError {
  constructor(message) {
    super(message, 400);
  }
}

class DataMergeError extends LuxBaseError {
  constructor(message) {
    super(message, 500);
  }
}

class InternalConfigurationError extends LuxBaseError {
  constructor(message) {
    super(message, 500);
  }
}

class InternalServerError extends LuxBaseError {
  constructor(message) {
    super(message, 500);
  }
}

class InvalidHostError extends LuxBaseError {
  constructor(message) {
    super(message, 400);
  }
}

class InvalidSearchRequestError extends LuxBaseError {
  constructor(message) {
    super(`${INVALID_SEARCH_REQUEST_LABEL}: ${message}`, 400);
  }
}

class LoopDetectedError extends LuxBaseError {
  constructor(message) {
    super(message, 508);
  }
}
class NotAcceptingWriteRequestsError extends LuxBaseError {
  constructor(message) {
    super(message, 409);
  }
}
class NotFoundError extends LuxBaseError {
  constructor(message) {
    super(message, 404);
  }
}

class NotImplementedError extends LuxBaseError {
  constructor(message) {
    super(message, 501);
  }
}

class ScaleEnvironmentError extends LuxBaseError {
  constructor(message) {
    super(message, 500);
  }
}

class ServerConfigurationChangedError extends LuxBaseError {
  constructor(message) {
    super(message, 503);
  }
}

// Because e.name isn't InvalidSearchRequestError within a catch block :(
function isInvalidSearchRequestError(e) {
  return e.message && e.message.includes(INVALID_SEARCH_REQUEST_LABEL);
}

export {
  LuxBaseError,
  AccessDeniedError,
  BadRequestError,
  DataMergeError,
  InternalConfigurationError,
  InternalServerError,
  InvalidHostError,
  InvalidSearchRequestError,
  LoopDetectedError,
  NotAcceptingWriteRequestsError,
  NotFoundError,
  NotImplementedError,
  ScaleEnvironmentError,
  ServerConfigurationChangedError,
  isInvalidSearchRequestError,
};
