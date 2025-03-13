import { getMatches } from '../../lib/autoComple.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';

const unitName = external.unitName;
const text = external.text;
const context = external.context;
const fullyHonorContext = external.fullyHonorContext;
const onlyMatchOnPrimaryNames = external.onlyMatchOnPrimaryNames;
const onlyReturnPrimaryNames = external.onlyReturnPrimaryNames;
const page = external.page;
const pageLength = external.pageLength;
const filterIndex = external.filterIndex;
const previouslyFiltered = external.previouslyFiltered;
const timeoutInMilliseconds = external.timeoutInMilliseconds;
handleRequest(function () {
  return getMatches(
    text,
    context,
    fullyHonorContext,
    onlyMatchOnPrimaryNames,
    onlyReturnPrimaryNames,
    page,
    pageLength,
    filterIndex,
    previouslyFiltered,
    timeoutInMilliseconds
  );
}, unitName);
