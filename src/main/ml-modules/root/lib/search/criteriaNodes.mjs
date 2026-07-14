'use strict';

// Node type discriminators for the analyzed criteria tree.
const NODE_TYPE_LEAF = 'leaf';
const NODE_TYPE_GROUP = 'group';

// Creates a leaf node representing a single resolved search term.
function createLeafNode({
  id,
  name,
  scope,
  searchTerm,
  patternInstance,
  contributesScore,
}) {
  return Object.freeze({
    type: NODE_TYPE_LEAF,
    id,
    name,
    scope,
    searchTerm,
    patternInstance,
    contributesScore,
  });
}

// Creates a group node representing an AND/OR/NOT conjunction.
// Children are an array of leaf and/or group nodes (already flattened
// where inlining applies — e.g. AND-in-AND, OR-in-OR).
// hasScoreContributingCriteria summarizes whether any leaf in this subtree
// contributes a relevance score — eliminates propagation bugs between passes.
function createGroupNode({
  id = null,
  conjunctionType,
  scope,
  children,
  columns,
  isTopLevel = false,
  hasScoreContributingCriteria = false,
}) {
  return Object.freeze({
    type: NODE_TYPE_GROUP,
    id,
    conjunctionType,
    scope,
    children: Object.freeze(children),
    columns,
    isTopLevel,
    hasScoreContributingCriteria,
  });
}

// Top-level analysis result returned by analyzeCriteria.
function createAnalysisResult({
  criteriaTree,
  scope,
  isMultiScope,
  scopeTypes = null,
  hasScoreContributingCriteria,
  usableLeafCount,
}) {
  return Object.freeze({
    criteriaTree,
    scope,
    isMultiScope,
    scopeTypes,
    hasScoreContributingCriteria,
    usableLeafCount,
  });
}

export {
  NODE_TYPE_GROUP,
  NODE_TYPE_LEAF,
  createAnalysisResult,
  createGroupNode,
  createLeafNode,
};
