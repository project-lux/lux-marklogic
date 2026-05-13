import op from '/MarkLogic/optic.mjs';
import { isArray } from '../../../utils/utils.mjs';
import { convertPartialDateTimeToSeconds } from '../../../utils/dateUtils.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../../errorClasses.mjs';
import { COMPARATORS } from '../../SearchCriteriaProcessor.mjs';
import { SearchPatternBase, CHILD_TYPE_ATOMIC } from './SearchPatternBase.mjs';

class DateRange extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const name = searchTerm.getName();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    // Identify indexes and configure lexicons.
    if (
      !isArray(termConfig.getIndexReferences()) ||
      termConfig.getIndexReferences().length !== 2
    ) {
      throw new InternalServerError(
        `The '${name}' search term within the '${searchTerm.getScopeName()}' scope is not correctly configured: two indexes are required.`,
      );
    }

    // Determine which indexes to use based on timespanMode
    let startIndexName;
    let endIndexName;
    let startColName = id + '_start';
    let endColName = id + '_end';
    const timespanMode = searchTerm.getTimespanMode();
    if (timespanMode === 'begin') {
      startIndexName = termConfig.getIndexReferences()[0];
      endIndexName = termConfig.getIndexReferences()[0];
      endColName = startColName;
    } else if (timespanMode === 'end') {
      startIndexName = termConfig.getIndexReferences()[1];
      endIndexName = termConfig.getIndexReferences()[1];
      startColName = endColName;
    } else {
      // 'full' or default
      startIndexName = termConfig.getIndexReferences()[0];
      endIndexName = termConfig.getIndexReferences()[1];
    }

    // Accept two dates, requiring at least one.
    const delim = ';';
    let dates = termValue;
    if (dates.indexOf(delim) === -1) {
      dates += delim;
    }
    dates = dates.split(';');
    if (dates.length > 2) {
      throw new InvalidSearchRequestError(
        `the '${name}' search term only accepts one or two dates separated by a semicolon.`,
      );
    }
    let startDateStr = dates[0].length > 0 ? dates[0] : null;
    let endDateStr = dates[1].length > 0 ? dates[1] : null;
    if (!startDateStr && !endDateStr) {
      throw new InvalidSearchRequestError(
        `the '${name} search term requires at least one date, such as '1800;1810', '1800', '1800;', or ';1810' (end of date range only).`,
      );
    }

    if (startDateStr && !endDateStr) {
      endDateStr = startDateStr;
    } else if (!startDateStr && endDateStr) {
      startDateStr = endDateStr;
    }

    // Convert to seconds. startDateLong is the start boundary of the search range (aS);
    // endDateLong is the end boundary (aE).
    const operator = searchTerm.getComparisonOperator();
    const startDateLong = convertPartialDateTimeToSeconds(startDateStr, true);
    const endDateLong = convertPartialDateTimeToSeconds(endDateStr, false);

    // Set up the Optic query's constraints and lexicons.
    // Operators > and >= test the document's start date (qS).
    // Operators < and <= test the document's end date (qE).
    // Operator = tests both (overlap). Operator != uses CTS.
    const constraints = [];
    const ctsConstraints = [];
    const needStartCol = ['>', '>=', '=', '!='].includes(operator);
    const needEndCol = ['<', '<=', '='].includes(operator);
    const lexicons = {};
    if (needStartCol) {
      lexicons[startColName] = cts.fieldReference(startIndexName);
    }
    if (needEndCol) {
      lexicons[endColName] = cts.fieldReference(endIndexName);
    }

    if (['>', '>=', '<', '<='].includes(operator)) {
      // > and >= test the document's start date (qS) against the search boundary.
      // < and <= test the document's end date (qE) against the search boundary.
      // Use the start of the search date for >= and <; the end of the search date for > and <=.
      // Example: ">= 1800" requires qS >= 1800-01-01T00:00:00.
      // Example: "< 1800" requires qE < 1800-01-01T00:00:00.
      const colName = ['<', '<='].includes(operator)
        ? endColName
        : startColName;
      const dateLong = ['>=', '<'].includes(operator)
        ? startDateLong
        : endDateLong;
      constraints.push(COMPARATORS[operator](op.col(colName), dateLong));
    } else if (operator === '=') {
      // Overlap: a document qualifies if its timespan [qS, qE] overlaps the search range [aS, aE].
      // Condition: qS <= aE AND qE >= aS
      constraints.push(op.le(op.col(startColName), endDateLong));
      constraints.push(op.ge(op.col(endColName), startDateLong));
    } else if (operator === '!=') {
      // Complement of overlap: a document qualifies if its timespan does NOT overlap [aS, aE].
      // Condition: qS > aE OR qE < aS
      // Note: startIndexName and endIndexName are already adjusted by timespanMode above.
      ctsConstraints.push(
        cts.orQuery([
          cts.fieldRangeQuery(startIndexName, '>', endDateLong),
          cts.fieldRangeQuery(endIndexName, '<', startDateLong),
        ]),
      );
    } else {
      throw new InternalServerError(
        `The date range pattern has not accounted for the '${operator}' operator.`,
      );
    }

    return {
      constraints,
      ctsConstraints,
      lexicons,
    };
  }

  getRequiredRuntimeSearchTermProperties() {
    return ['comp']; // comparison operator is required
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return null;
  }

  getDefaultSearchOptionsName() {
    return null;
  }
}

const DateRangePattern = Object.freeze(new DateRange());

export { DateRangePattern };
