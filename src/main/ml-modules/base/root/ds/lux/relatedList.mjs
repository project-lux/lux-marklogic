import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getRelatedList } from '../../lib/relatedListsLib.mjs';

const searchScopeName = external.scope;
const relatedListName = external.name;
const uri = external.uri;
const page = external.page;
const pageLength = external.pageLength;
const relationshipsPerRelation = external.relationshipsPerRelation;

handleRequest(function () {
  return getRelatedList({
    searchScopeName,
    relatedListName,
    uri,
    page,
    pageLength,
    relationshipsPerRelation,
  });
});
