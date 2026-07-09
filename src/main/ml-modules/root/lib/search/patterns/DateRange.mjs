import { isArray } from '../../../utils/utils.mjs';
import { convertPartialDateTimeToSeconds } from '../../../utils/dateUtils.mjs';
import { InternalServerError } from '../../errorClasses.mjs';
import { SearchPatternBase, CHILD_TYPE_ATOMIC } from './SearchPatternBase.mjs';

class DateRange extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const name = searchTerm.getName();

    const operator = searchTerm.getComparisonOperator();
    this.requireRangeOperator(name, operator);

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
    const timespanMode = searchTerm.getTimespanMode();
    if (timespanMode === 'begin') {
      startIndexName = termConfig.getIndexReferences()[0];
      endIndexName = termConfig.getIndexReferences()[0];
    } else if (timespanMode === 'end') {
      startIndexName = termConfig.getIndexReferences()[1];
      endIndexName = termConfig.getIndexReferences()[1];
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
    const startDateLong = convertPartialDateTimeToSeconds(startDateStr, true);
    const endDateLong = convertPartialDateTimeToSeconds(endDateStr, false);

    // All operators use cts.fieldRangeQuery for Opt 18 compatibility.
    // Operators > and >= test the document's start date (qS).
    // Operators < and <= test the document's start date (qS).
    // Operator = tests both (overlap). Operator != uses OR of two ranges.
    const ctsConstraints = [];

    const termSearchOptions = []; // Electing not to use searchTerm's options.
    const termWeight = searchTerm.getWeight();
    if (['>', '>=', '<', '<='].includes(operator)) {
      // All single-sided operators test the document's start date (qS).
      // Use the start of the search date for >= and <; the end of the search date for > and <=.
      const dateLong = ['>=', '<'].includes(operator)
        ? startDateLong
        : endDateLong;
      ctsConstraints.push(
        cts.fieldRangeQuery(
          startIndexName,
          operator,
          dateLong,
          termSearchOptions,
          termWeight,
        ),
      );
    } else if (operator === '=') {
      // Overlap: a document qualifies if its timespan [qS, qE] overlaps the search range [aS, aE].
      // Condition: qS <= aE AND qE >= aS
      ctsConstraints.push(
        cts.fieldRangeQuery(
          startIndexName,
          '<=',
          endDateLong,
          termSearchOptions,
          termWeight,
        ),
      );
      ctsConstraints.push(
        cts.fieldRangeQuery(
          endIndexName,
          '>=',
          startDateLong,
          termSearchOptions,
          termWeight,
        ),
      );
    } else if (operator === '!=') {
      // Complement of overlap: a document qualifies if its timespan does NOT overlap [aS, aE].
      // Condition: qS > aE OR qE < aS
      ctsConstraints.push(
        cts.orQuery([
          cts.fieldRangeQuery(
            startIndexName,
            '>',
            endDateLong,
            termSearchOptions,
            termWeight,
          ),
          cts.fieldRangeQuery(
            endIndexName,
            '<',
            startDateLong,
            termSearchOptions,
            termWeight,
          ),
        ]),
      );
    } else {
      throw new InternalServerError(
        `The date range pattern has not accounted for the '${operator}' operator.`,
      );
    }

    return { ctsConstraints };
  }

  mayTokenizeValue() {
    return false;
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

const PATTERN_NAME_DATE_RANGE = 'dateRange';
SearchPatternBase.register(PATTERN_NAME_DATE_RANGE, new DateRange());

export { PATTERN_NAME_DATE_RANGE };
