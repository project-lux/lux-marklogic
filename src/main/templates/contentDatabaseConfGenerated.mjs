const contentDatabaseConfGenerated = @@contentDatabaseConfGenerated@@

const fieldPaths = contentDatabaseConfGenerated.field.reduce(
  (fieldPathsObj, current) => {
    if (current['field-name'] && current['field-path']) {
      const { 'field-name': fieldName, 'field-path': fieldPath } = current;
      fieldPathsObj[fieldName] = fieldPath.map((pathObj) => pathObj.path);
    }
    return fieldPathsObj;
  },
  {}
);

export { fieldPaths };
