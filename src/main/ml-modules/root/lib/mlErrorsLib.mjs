/*
 * Error class extensions defined herein are intended to be thrown by code needing to halt the request.
 * When allowed to reach the app server's custom error handler, the error handlers uses the error's
 * class name to determine the response's status code and status message.  Only the class name and
 * message reach the error handler.
 */
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

class InternalServerError extends Error {
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

export {
  BadRequestError,
  DataMergeError,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
};
