cts.andQuery([
  cts.jsonPropertyValueQuery('dataType', ['Place'], ['exact']),
  cts.fieldValueQuery(
    ['placePartOfId'],
    [
      'https://lux.collections.yale.edu/data/place/46d4ec4a-77f0-4f43-9e23-e46b2f4a5ef6',
    ],
    ['exact'],
    1,
  ),
]);
