/*
 * Error class extensions defined herein are intended to be thrown by code needing to halt the request.
 */

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
    super(message, 400);
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

export {
  LuxBaseError,
  AccessDeniedError,
  BadRequestError,
  DataMergeError,
  InternalServerError,
  InvalidHostError,
  InvalidSearchRequestError,
  LoopDetectedError,
  NotAcceptingWriteRequestsError,
  NotFoundError,
  NotImplementedError,
  ScaleEnvironmentError,
  ServerConfigurationChangedError,
};
