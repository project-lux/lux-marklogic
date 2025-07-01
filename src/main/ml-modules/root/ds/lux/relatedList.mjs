import { handleRequest } from '../../lib/securityLib.mjs';
import { getRelatedList } from '../../lib/relatedListsLib.mjs';

const unitName = external.unitName;
const searchScopeName = external.scope;
const relatedListName = external.name;
const uri = external.uri;
const page = external.page;
const pageLength = external.pageLength;
const filterResults = external.filterResults;
const relationshipsPerRelation = external.relationshipsPerRelation;

const response = handleRequest(function () {
  return getRelatedList({
    searchScopeName,
    relatedListName,
    uri,
    page,
    pageLength,
    filterResults,
    relationshipsPerRelation,
  });
}, unitName);

export default response;
