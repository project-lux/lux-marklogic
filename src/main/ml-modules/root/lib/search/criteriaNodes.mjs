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

// Walks the IR tree, calling handlers for each node. Handlers:
//   onLeaf(node, parent)  — called for leaf nodes
//   onGroup(node, parent) — called for group nodes (before visiting children)
function walkIR(node, handlers, parent = null) {
  if (node.type === NODE_TYPE_LEAF) {
    handlers.onLeaf?.(node, parent);
  } else if (node.type === NODE_TYPE_GROUP) {
    handlers.onGroup?.(node, parent);
    for (const child of node.children) {
      walkIR(child, handlers, node);
    }
  }
}

// Returns true if the IR subtree rooted at `node` contains any leaf
// whose contributesScore flag is true.
function hasScoreContributor(node) {
  if (node.type === NODE_TYPE_LEAF) {
    return node.contributesScore;
  }
  return node.children.some(hasScoreContributor);
}

// Collects all usable leaf nodes from the IR subtree.
function collectLeaves(node) {
  if (node.type === NODE_TYPE_LEAF) {
    return [node];
  }
  const leaves = [];
  for (const child of node.children) {
    leaves.push(...collectLeaves(child));
  }
  return leaves;
}

export {
  NODE_TYPE_GROUP,
  NODE_TYPE_LEAF,
  collectLeaves,
  createAnalysisResult,
  createGroupNode,
  createLeafNode,
  hasScoreContributor,
  walkIR,
};
