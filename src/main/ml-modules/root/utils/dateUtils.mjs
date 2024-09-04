import { BadRequestError } from '../lib/mlErrorsLib.mjs';

const MIN_SUPPORTED_FULL_DATE_IN_SECONDS =
  new Date('-009999-01-01T00:00:00.000Z').getTime() / 1000;
const MAX_SUPPORTED_FULL_DATE_IN_SECONDS =
  new Date('9999-12-31T23:59:59.000Z').getTime() / 1000;

/**
 * Convert the given number to a String. Years in the range [-9999:9999] will support the full ISO 8601 format. Outside of that range, only return the year
 *
 * @param {Number} seconds The number of seconds to convert to a date string
 * @returns {String} A date string. Years in the range [-9999:9999] will support the full ISO 8601 format. Outside of that range, only return the year
 */
function convertSecondsToDateStr(seconds) {
  // if we are outside the supported range for full dates, just return year
  if (
    seconds < MIN_SUPPORTED_FULL_DATE_IN_SECONDS ||
    seconds > MAX_SUPPORTED_FULL_DATE_IN_SECONDS
  ) {
    const year = Math.round(seconds / 60 / 60 / 24 / 365.2425) + 1970;
    return year.toString();
  }
  // Default to using javascript's Date class for the supported range
  return new Date(seconds * 1000).toISOString();
}

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

  // The optional hyphen (for B.C. / BCE) is in a group as it must be accounted for when determining how much
  // of the suffix to use.
  const match = dateTimeStr
    ? dateTimeStr.match('^[0-9]{4,}|^(-?)[0-9]{6,}')
    : null;
  if (match === null) {
    throw new BadRequestError(
      `Invalid date format: '${origDateTimeStr}'.
      The format is 'YYYY-MM-DDThh:mm:ss.000Z' or '-YYYYYY-MM-DDThh:mm:ss.000Z' for negative dates, whereby at least the year must be specified.
      Leading zeros in the year are not optional.
      Dates may be zero or negative, denoting B.C.E. (a.k.a., B.C.).
      When providing less than an entire xs.dateTime value, the system will populate the rest of the value based on the operator or whether the search tag is configured as a start (vs. end) date.
      When providing more than 'YYYY-MM-DD', quote the entire value.`
        .replace(/\n/g, ' ')
        .replace(/[ ]{2,}/g, ' ')
    );
  }
  const year = match[0];

  // When the given value's length is shorter than that of our targeted syntax (YYYY-MM-DDThh:mm:ss.000Z),
  // append the difference, taking into account whether the start or end is desired.
  const targetedSyntaxLength = year.length + 20; // 20 is the length of either suffix
  if (dateTimeStr.length < targetedSyntaxLength) {
    const suffix =
      start === true ? '-01-01T00:00:00.000Z' : '-12-31T23:59:59.000Z';
    dateTimeStr =
      dateTimeStr +
      suffix.substring(
        suffix.length - (targetedSyntaxLength - dateTimeStr.length)
      );
  }

  return dateTimeStr;
}

function _convertDateTimeToSeconds(dateTimeStr) {
  const negativeDate = dateTimeStr.startsWith('-');
  const pieces = dateTimeStr.split('-');
  const year = parseInt(negativeDate ? `-${pieces[1]}` : pieces[0]);

  let totalSeconds;
  if (year >= -9999 && year <= 9999) {
    totalSeconds = new Date(dateTimeStr).getTime() / 1000;
  }
  // Else, we exceeded our agreed full Date support and need to calculate ourselves.
  else {
    totalSeconds = (year - 1970) * 365.2425 * 24 * 60 * 60;
  }

  if (isNaN(totalSeconds)) {
    throw new BadRequestError(
      `Unable to convert date '${dateTimeStr}' into seconds.`
    );
  }

  // calculated seconds may not be an integer, but we are comparing against an integer in the field range index
  const roundedTotalSeconds = Math.round(totalSeconds);

  return roundedTotalSeconds;
}

export { convertSecondsToDateStr, convertPartialDateTimeToSeconds };
