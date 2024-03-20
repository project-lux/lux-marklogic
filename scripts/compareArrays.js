/*
 * This script offers an alternative implementation of utils.getArrayDiff that
 * returns the following in a single call:
 *
 * 1. Items are in array 1 but not array 2.
 * 2. Items are in array 2 but not array 1.
 *
 * Can be particularly helpful when comparing lists of URIs that have the same
 * length.  Set dedup to true to have any duplicates removed before comparing.
 */
'use strict';

const dedup = true;

let arr1 = [
  'https://lux.collections.yale.edu/data/object/ddd672f1-3d7a-4888-83b5-c0afa7248667',
  'https://lux.collections.yale.edu/data/object/92a6e57e-b0bb-4429-927f-e49fba870475',
  'https://lux.collections.yale.edu/data/object/9305758f-70ac-437e-8cf4-c1a7c7b5e6ef',
];
if (dedup) {
  arr1 = [...new Set(arr1)];
}

let arr2 = [
  'https://lux.collections.yale.edu/data/object/ddd672f1-3d7a-4888-83b5-c0afa7248667',
  'https://lux.collections.yale.edu/data/object/000de659-fce8-4b8d-9b4a-c9bb3c97bc61',
  'https://lux.collections.yale.edu/data/object/9305758f-70ac-437e-8cf4-c1a7c7b5e6ef',
];
if (dedup) {
  arr2 = [...new Set(arr2)];
}

function getArrayDiff(arr1, arr2) {
  const onlyInArr1 = arr2.filter((item) => {
    return !arr1.includes(item);
  });
  const onlyInArr2 = arr1.filter((item) => {
    return !arr2.includes(item);
  });
  return {
    onlyInArr1,
    onlyInArr2,
  };
}

getArrayDiff(arr2, arr1);
