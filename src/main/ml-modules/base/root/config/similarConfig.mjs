import { fieldPaths } from './contentDatabaseConfGenerated.mjs';
import {
  getIRI,
  getLanguageIRI,
  getOptionalIRIs,
} from '../lib/dataConstants.mjs';

const ASPECT_NAME_RESERVED = '_RESERVED';

const SIMILAR_BUILDER_CONFIG = {
  regular: (term, childTerm, weight, value) => {
    const searchObj = { _weight: weight };
    if (childTerm) {
      const childObj = {};
      childObj[childTerm] = value;
      searchObj[term] = childObj;
    } else {
      searchObj[term] = value;
    }
    return searchObj;
  },
  date: (term, child, weight, dateRangeStr) => {
    const AND = [];
    const searchObj = {
      AND: AND,
    };
    const { min, max } = getMinAndMaxYears(dateRangeStr);
    const adjustedDateRangeStr = `${min};${max}`;
    const minObj = { _comp: '>', _weight: weight };
    minObj[term] = adjustedDateRangeStr;
    const maxObj = { _comp: '<', _weight: weight };
    maxObj[term] = adjustedDateRangeStr;
    AND.push(minObj, maxObj);
    return searchObj;

    function getMinAndMaxYears(dateRangeStr) {
      const datesArr = dateRangeStr.split(';');
      const startDateStr = datesArr[0].length > 0 ? datesArr[0] : null;
      const endDateStr = datesArr[1].length > 0 ? datesArr[1] : null;

      let min = 0;
      if (startDateStr) {
        const year = parseInt(startDateStr.slice(0, 4));
        const diff = getYearDiff(year);
        min = convertYearToStr(year - diff);
      }

      let max = 0;
      if (endDateStr) {
        const year = parseInt(endDateStr.slice(0, 4));
        const diff = getYearDiff(year);
        max = convertYearToStr(year + diff);
      }

      return {
        min,
        max,
      };

      function getYearDiff(year) {
        return year > 1900 ? 10 : year > 1700 ? 20 : 35;
      }

      function convertYearToStr(year) {
        return year.toString().padStart(4, '0');
      }
    }
  },
};

const SIMILAR_CONFIG = {
  // format of similarConfig is:
  // ${SCOPE}: {              // the scope of the query (agent, item, work, etc.)
  //  ${ASPECT}               // the aspects/options across which to find similar results(keyword, time, concept, place, etc.)
  //    ${SEARCHTERM}: {      // the search terms relevant to each aspect (text, typeId, memberOfId, startDate, etc.)
  //                             ASPECT_NAME_RESERVED is a reserved aspect and is to apply regardless of the request-specified aspects.
  //      child: ${STRING}    // name of the child property if applicable, else null e.g. 'memberOf' needs an 'id' child property
  //      paths: []           // XPaths from which to pull values from the document. Usually a MarkLogic index field
  //      ignore: []          // values to ignore for this search type
  //      weight:             // the weight to apply to this search term
  //      searchBuilderFunc:  // function that determines how the search object is built for each value
  //  }
  // }
  agent: {
    keyword: {
      text: {
        child: null,
        paths: [
          // this was the field agentDescriptionNoteText, but that field was removed
          `/json[type = ('Group', 'Person')]/referred_to_by[./classified_as/id='${getIRI(
            'biographyStatement'
          )}']/content`,
          // there is no field configuration for this one
          `/json[type = ('Group', 'Person')]/referred_to_by[./classified_as/id='${getIRI(
            'descriptionStatement'
          )}' and ./language/id='${getLanguageIRI('en')}']/content`,
        ],
        ignore: ['born', 'died'],
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
    },
    concept: {
      classification: {
        child: 'id',
        paths: [...fieldPaths.agentTypeId],
        // ignore sex/gender when looking at agent types
        ignore: getOptionalIRIs(['male', 'female', 'intersexual']),
        weight: 2,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
    },
    agent: {
      memberOf: {
        child: 'id',
        paths: [...fieldPaths.agentMemberOfId],
        ignore: [],
        weight: 2,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
    },
    time: {
      startDate: {
        child: null,
        date: true,
        paths: [...fieldPaths.agentBornStartDateStr],
        weight: 2,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.date,
      },
      endDate: {
        child: null,
        date: true,
        paths: [...fieldPaths.agentDiedStartDateStr],
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.date,
      },
    },
  },
  item: {
    keyword: {
      text: {
        child: null,
        paths: [
          // this was the field itemDescriptionNoteText, but that field was removed
          `/json[type = ('HumanMadeObject', 'DigitalObject')]/referred_to_by[./classified_as/id='${getIRI(
            'descriptionStatement'
          )}']/content`,
          ...fieldPaths.itemPrimaryName,
          ...fieldPaths.itemName,
        ],
        ignore: [],
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
    },
    concept: {
      classification: {
        child: 'id',
        paths: [...fieldPaths.itemTypeId],
        ignore: getOptionalIRIs(['collectionItem']),
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
      material: {
        child: 'id',
        paths: [...fieldPaths.itemMaterialId],
        ignore: [],
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
      },
    },
    time: {
      producedDate: {
        child: null,
        date: true,
        paths: [...fieldPaths.itemProductionStartDateStr],
        weight: 1,
        searchBuilderFunc: SIMILAR_BUILDER_CONFIG.date,
      },
    },
  },
};

// Add the reserved aspect to every scope
Object.keys(SIMILAR_CONFIG).forEach((scopeName) => {
  SIMILAR_CONFIG[scopeName][ASPECT_NAME_RESERVED] = {
    recordType: _getRecordTypeConfig(),
  };
});

function _getRecordTypeConfig() {
  return {
    child: null,
    paths: ['/json/type'],
    weight: 1,
    mandatory: false, // Set to true if we're allowed to exclude other types
    searchBuilderFunc: SIMILAR_BUILDER_CONFIG.regular,
  };
}

export { ASPECT_NAME_RESERVED, SIMILAR_CONFIG };
