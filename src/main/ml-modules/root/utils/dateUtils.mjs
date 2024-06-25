import { BadRequestError } from '../lib/mlErrorsLib.mjs';

const DAY_IN_SECONDS = 86400;
const ONE_YEAR_IN_SECONDS = DAY_IN_SECONDS * 365; // purposely doesn't account for leap year
const YEAR_ZERO_IN_SECONDS = new Date('0000-01-01T00:00:00Z').getTime() / 1000;

/**
 * Convert the given string to a xs.dateTime-formatted string.  Able to complete a partial value, so long as at least the year is provided.
 *
 * @param {String} dateTimeStr The string to convert to a xs.dateTime string.
 * @param {Boolean} start Able to influence the auto-completed portion of the date time value.  Only used when operator is not GT, GE, LT, or LE.
 *        Submit true if this is a start date or false for an end date.
 * @param {String} operator Able to influence the auto-completed portion of the date time value.  Only used when operator is GT, GE, LT, or LE.
 * @returns {String} An xs.dateTime-formatted version of the given value; note that this function supports values that xs.dateTime() does not,
 *        including dates older than 10,000 BCE.
 */
function convertPartialDateTimeToSeconds(dateTimeStr, start = true) {
  // Get a xs.dateTime-formatted version.
  dateTimeStr = _completeDateTimeValue(dateTimeStr, start);
  // Convert to seconds.
  return _convertDateTimeToSeconds(dateTimeStr);
}

function _completeDateTimeValue(dateTimeStr, start = true) {
  if (typeof dateTimeStr != 'string') {
    dateTimeStr = new String(dateTimeStr);
  }
  const origDateTimeStr = dateTimeStr;
  dateTimeStr = _addLeadingZerosToDateTimeStr(dateTimeStr);

  // The optional hyphen (for B.C. / BCE) is in a group as it must be accounted for when determining how much
  // of the suffix to use.
  const match = dateTimeStr ? dateTimeStr.match('^(-?)[0-9]{4,}') : null;
  if (match === null) {
    throw new BadRequestError(
      `Invalid date format: '${origDateTimeStr}'.
      The format is 'YYYY-MM-DDThh:mm:ss' whereby at least the year must be specified.
      Leading zeros in the year are optional.
      Dates may be negative, denoting B.C.E. (a.k.a., B.C.).
      When providing less than an entire xs.dateTime value, the system will populate the rest of the value based on the operator or whether the search tag is configured as a start (vs. end) date.
      When providing more than 'YYYY-MM-DD', quote the entire value.`
        .replace(/\n/g, ' ')
        .replace(/[ ]{2,}/g, ' ')
    );
  }
  const year = match[0];

  // When the given value's length is shorter than that of our targeted syntax (YYYY-MM-DDThh:mm:ssZ),
  // append the difference, taking into account whether the start or end is desired.
  const targetedSyntaxLength = year.length + 16; // 16 is the length of either suffix
  if (dateTimeStr.length < targetedSyntaxLength) {
    const suffix = start === true ? '-01-01T00:00:00Z' : '-12-31T23:59:59Z';
    dateTimeStr =
      dateTimeStr +
      suffix.substring(
        suffix.length - (targetedSyntaxLength - dateTimeStr.length)
      );
  }

  return dateTimeStr;
}

function _addLeadingZerosToDateTimeStr(dateTimeStr) {
  const isNegative = dateTimeStr.startsWith('-');
  if (isNegative) {
    dateTimeStr = dateTimeStr.slice(1);
  }
  const dateSplitHyphens = dateTimeStr.split('-');
  //the first string is the year, pad it with 0s
  if (/^\d+$/.test(dateSplitHyphens[0])) {
    dateSplitHyphens[0] = dateSplitHyphens[0].padStart(4, '0');
  }
  dateTimeStr = dateSplitHyphens.join('-');
  if (isNegative) {
    dateTimeStr = `-${dateTimeStr}`;
  }
  return dateTimeStr;
}

function _convertDateTimeToSeconds(dateTimeStr) {
  const negativeDate = dateTimeStr.startsWith('-');
  const pieces = dateTimeStr.split('-');
  const year = parseInt(negativeDate ? `-${pieces[1]}` : pieces[0]);

  let totalSeconds;
  if (year >= 1 && year < 10000) {
    totalSeconds = new Date(dateTimeStr).getTime() / 1000;
  }
  // Else, we exceeded JavaScript's Date support and need to calculate ourselves.
  else {
    totalSeconds = _adjustForPythonFromYear(
      year,
      _yearToApproximateSeconds(year, negativeDate, pieces)
    );
  }

  if (isNaN(totalSeconds)) {
    throw new BadRequestError(
      `Unable to convert date '${dateTimeStr}' into seconds.`
    );
  }

  return totalSeconds;
}

function _adjustForPythonFromYear(year, secondsToAdjust) {
  if (year <= -100 || year >= 10000) {
    secondsToAdjust -= _getPythonAdjustmentInSeconds(year);
  }
  return secondsToAdjust;
}

// The JavaScript algorithm makes too large of negative numbers and too small of positive numbers,
// when compared to Python's https://numpy.org/ library, which is used to calculate dates in
// 64bit seconds within the data pipeline and thus documents.  The following adjustment gets
// us closer to the Python values.  It is how much we should adjust for every 1,000 years and
// was calculated by subtracting Python's value for -1000-01-01T00:00:00 from the above,
// divided by 1, 000, and manually tweaked until we're only off 0.13 years per 65 million years.
// Adjustment does not appear necessary until we hit year -0100.
//
// Here's the Python code we're trying to align with:
//
//   import numpy as np
//   np.datetime64('-65000000-01-01T00:00:00').astype('<M8[s]').astype(np.int64 )
//
function _getPythonAdjustmentInSeconds(year) {
  return 0.02055 * (year / 1000) * ONE_YEAR_IN_SECONDS;
}

function _yearToApproximateSeconds(year, negativeDate, pieces = null) {
  // Before accounting for leap years, here is the number of seconds in the specified year.
  const yearInSeconds = year * ONE_YEAR_IN_SECONDS;

  // Calculate the rest of the date in seconds.
  let restOfDateInSeconds = 0;
  if (pieces) {
    const restOfDateTimeStr = pieces
      .slice(negativeDate ? 2 : 1, pieces.length)
      .join('-');
    const restOfDateStr = `1970-${restOfDateTimeStr}`;
    restOfDateInSeconds = new Date(restOfDateStr).getTime() / 1000;
    if (negativeDate) {
      restOfDateInSeconds = restOfDateInSeconds * -1;
    }
  }

  const leapYears = Math.ceil(year / 4) * DAY_IN_SECONDS;

  return yearInSeconds + restOfDateInSeconds + leapYears + YEAR_ZERO_IN_SECONDS;
}

export { convertPartialDateTimeToSeconds };
