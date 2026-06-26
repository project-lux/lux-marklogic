cts.andQuery([
  cts.jsonPropertyValueQuery(
    'dataType',
    ['DigitalObject', 'HumanMadeObject'],
    ['exact'],
  ),
  cts.fieldValueQuery(
    ['itemMemberOfId'],
    [
      'https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056',
    ],
    ['exact'],
    1,
  ),
]);
