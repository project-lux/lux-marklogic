'use strict';

// Intermediate Representation (IR) node type discriminators.
const NODE_TYPE_LEAF = 'leaf';
const NODE_TYPE_GROUP = 'group';

// Creates a leaf IR node representing a single resolved search term.
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

// Creates a group IR node representing an AND/OR/NOT conjunction.
// Children are an array of leaf and/or group nodes (already flattened
// where inlining applies — e.g. AND-in-AND, OR-in-OR).
function createGroupNode({
  id = null,
  conjunctionType,
  scope,
  children,
  columns,
  isTopLevel = false,
}) {
  return Object.freeze({
    type: NODE_TYPE_GROUP,
    id,
    conjunctionType,
    scope,
    children: Object.freeze(children),
    columns,
    isTopLevel,
  });
}

// Top-level analysis result returned by analyzeCriteria.
function createAnalysisResult({
  ir,
  scope,
  isMultiScope,
  hasScoreContributingCriteria,
  usableLeafCount,
}) {
  return Object.freeze({
    ir,
    scope,
    isMultiScope,
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
