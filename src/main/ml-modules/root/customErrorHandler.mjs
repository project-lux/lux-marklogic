import { TRACE_NAME_ERROR } from '/lib/appConstants.mjs';

let errorObj =
  external.error != undefined && external.error != null
    ? external.error.toObject()
    : {};

const [statusCode, status] = xdmp.getResponseCode().toArray();
// When this trace event is enabled, log the raw error's details.
if (xdmp.traceEnabled(TRACE_NAME_ERROR)) {
  const traceError = {
    headers: { statusCode, status },
    body: errorObj,
  };
  // Not associated with monitoring tests or the log mining script.
  xdmp.trace(
    TRACE_NAME_ERROR,
    `Raw error details: ${JSON.stringify(traceError)}`,
  );
}

const errorStack = errorObj.stack;
const matches = errorStack
  ? errorStack.match('XDMP-ENDPOINTNULLABLE: ([^.]+[.]).*')
  : null;
const errorMessage =
  matches && matches.length > 1 ? matches[1] : errorObj.message;

const error = {
  errorResponse: {
    statusCode,
    status,
    messageCode: errorObj?.code ?? 'UnknownError',
    message: errorMessage ?? 'An unknown error occurred.',
  },
};

export default error;
