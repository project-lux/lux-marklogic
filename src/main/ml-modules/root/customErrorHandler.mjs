/*
 * We are overriding default REST API error handler ([/opt/MarkLogic/Modules]/MarkLogic/rest-api/error-handler.xqy)
 * to reduce the likelihood of returning a status code of 502, 503, or 504 for timed out requests as the generated
 * data service proxy retries requests with such response status codes.  Note that app server error handlers are not
 * called by ML when ML believes the service is unavailable (503).
 */
import { isNonEmptyArray } from './utils/utils.mjs';
import { TRACE_NAME_ERROR as traceName } from './lib/appConstants.mjs';
let errorBody =
  external.error != undefined && external.error != null
    ? external.error.toObject()
    : {};

// When this trace event is enabled, log the raw error's details.
if (xdmp.traceEnabled(traceName)) {
  const errorHeaders = xdmp.getResponseCode().toArray();
  const traceError = {
    headers: { statusCode: errorHeaders[0], status: errorHeaders[1] },
    body: errorBody,
  };
  // Not associated with monitoring tests or the log mining script.
  xdmp.trace(traceName, `Raw error details: ${JSON.stringify(traceError)}`);
}

// All returns from this error handler are to go through this function.
function getErrorResponseBody(statusCode, status, messageCode, message) {
  return {
    errorResponse: {
      statusCode,
      status,
      messageCode,
      message,
    },
  };
}

function getJSMessage(error) {
  let message = null;
  if (error && isNonEmptyArray(error.data)) {
    message = error.data[0];
    if (message.startsWith('Error: ')) {
      message = message.substring(7);
    }
  }
  return message;
}

function getJSClassName(errorBody) {
  let name = null;
  if (
    errorBody &&
    isNonEmptyArray(errorBody.stackFrames) &&
    errorBody.stackFrames[0].operation
  ) {
    name = errorBody.stackFrames[0].operation.slice(0, -2);
  }
  return name;
}

function getJSErrorResponseBody(errorBody) {
  const name = getJSClassName(errorBody);
  let statusCode = null;
  let status = null;
  let messageCode = null;
  let message = getJSMessage(errorBody);
  switch (name) {
    case 'BadRequestError':
      statusCode = 400;
      status = 'Bad Request';
      messageCode = 'BadRequestError';
      break;
    case 'DataMergeError':
      statusCode = 500;
      status = 'Internal Data Merge Error';
      messageCode = 'DataMergeError';
      break;
    case 'InternalServerError':
      statusCode = 500;
      status = 'Internal Server Error';
      messageCode = 'InternalServerError';
      break;
    // Convert to a bad request.
    case 'InvalidSearchRequestError':
      statusCode = 400;
      status = 'Bad Request';
      messageCode = 'BadRequestError';
      break;
    case 'NotFoundError':
      statusCode = 404;
      status = 'Not Found';
      messageCode = 'NotFoundError';
      break;
    case 'NotImplementedError':
      statusCode = 510;
      status = 'Not Implemented';
      messageCode = 'NotImplementedError';
      break;
    default:
      // When the error is thrown from within a catch block, we do not get the thrown error's name.
      // But if we have a message, we can be fairly certain the LUX code through it (vs. MarkLogic).
      // Most of the thrown errors are for bad requests.  Rolling with that.
      if (message) {
        statusCode = 400;
        status = 'Bad Request';
        messageCode = 'BadRequestError';
      } else {
        statusCode = 500;
        status = 'Internal Server Error';
        message = errorBody.message;
        messageCode = errorBody.code;
      }
  }
  return getErrorResponseBody(statusCode, status, messageCode, message);
}

// See if we need to change the response headers and body.
let overrideErrorHeaders = true;
if (errorBody.code == 'JS-JAVASCRIPT') {
  // Could be an instance of an error defined in mlErrorLib.
  errorBody = getJSErrorResponseBody(errorBody);
} else if (errorBody.code == 'XDMP-EXTIME') {
  errorBody = getErrorResponseBody(
    408,
    'Request Timeout',
    errorBody.code,
    errorBody.message
  );
} else if (errorBody.code == 'XDMP-ENDPOINTNULLABLE') {
  // Would like to surface which parameter was not specified.
  // XDMP-ENDPOINTNULLABLE: q is a parameter the request must provide a value for.\nin
  let message = errorBody.stack;
  if (message) {
    const matches = message.match('XDMP-ENDPOINTNULLABLE: ([^.]+[.]).*');
    if (matches && matches.length > 1) {
      message = matches[1];
    } else {
      message = errorBody.message;
    }
  }

  overrideErrorHeaders = false;
  const errorHeaders = xdmp.getResponseCode().toArray();
  errorBody = getErrorResponseBody(
    errorHeaders[0],
    errorHeaders[1],
    errorBody.code,
    message
  );
} else {
  overrideErrorHeaders = false;
  const errorHeaders = xdmp.getResponseCode().toArray();
  errorBody = getErrorResponseBody(
    errorHeaders[0],
    errorHeaders[1],
    errorBody.code,
    errorBody.message
  );
}
if (overrideErrorHeaders) {
  xdmp.setResponseCode(
    errorBody.errorResponse.statusCode,
    errorBody.errorResponse.status
  );
}

console.warn(JSON.stringify(errorBody));
errorBody;
