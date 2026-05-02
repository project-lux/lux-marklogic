import op from '/MarkLogic/optic.mjs';
import { isArray } from '../../../utils/utils.mjs';
import { convertPartialDateTimeToSeconds } from '../../../utils/dateUtils.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../../errorClasses.mjs';
import { COMPARATORS } from '../../SearchCriteriaProcessor.mjs';
import { SearchPatternBase, CHILD_TYPE_NONE } from './SearchPatternBase.mjs';

class DateRange extends SearchPatternBase {
  apply(searchCriteriaProcessor, searchTerm, patternOptions, requestOptions) {
    const id = searchTerm.getId();
    const name = searchTerm.getName();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const startColName = id + '_start';
    const endColName = id + '_end';

    // Identify indexes and configure lexicons.
    if (
      !isArray(termConfig.getIndexReferences()) ||
      termConfig.getIndexReferences().length !== 2
    ) {
      throw new InternalServerError(
        `The '${name}' search term within the '${searchTerm.getScopeName()}' scope is not correctly configured: two indexes are required.`,
      );
    }

    // Set up the Optic query's constraints and lexicons.  Make lexicons conditional if
    // if omission thereof improves performance.
    const constraints = [];
    const ctsConstraints = [];
    const lexicons = {
      [startColName]: cts.fieldReference(termConfig.getIndexReferences()[0]),
      [endColName]: cts.fieldReference(termConfig.getIndexReferences()[1]),
    };

    // Accept two dates, requiring at least one.
    const delim = ';';
    let dates = termValue;
    if (dates.indexOf(delim) === -1) {
      dates += delim;
    }
    dates = dates.split(';');
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

    // Convert to seconds, allowing the operator to help determine how to treat partial dates.
    const operator = searchTerm.getComparisonOperator();
    const startDateLong = convertPartialDateTimeToSeconds(startDateStr, true);
    const endDateLong = convertPartialDateTimeToSeconds(endDateStr, false);

    // TODO: document logic w/ example
    const isBefore = ['<', '>='].includes(operator);
    if (['>', '>=', '<', '<='].includes(operator)) {
      isBefore
        ? constraints.push(
            COMPARATORS[operator](op.col(startColName), startDateLong),
          )
        : constraints.push(
            COMPARATORS[operator](op.col(endColName), endDateLong),
          );
    } else if (['='].includes(operator)) {
      constraints.push(op.ge(op.col(startColName), startDateLong));
      constraints.push(op.le(op.col(endColName), endDateLong));
    } else if (['!='].includes(operator)) {
      ctsConstraints.push(
        cts.orQuery([
          cts.fieldRangeQuery(
            termConfig.getIndexReferences()[0],
            '<',
            startDateLong,
          ),
          cts.fieldRangeQuery(
            termConfig.getIndexReferences()[1],
            '>',
            endDateLong,
          ),
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
