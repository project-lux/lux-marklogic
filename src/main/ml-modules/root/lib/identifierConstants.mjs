const IDENTIFIERS = {
  biographyStatement: 'http://vocab.getty.edu/aat/300435422',
  collection: 'http://vocab.getty.edu/aat/300025976',
  collectionItem: 'http://vocab.getty.edu/aat/300404024',
  department: 'http://vocab.getty.edu/aat/300263534',
  descriptionStatement: 'http://vocab.getty.edu/aat/300435416',
  exhibition: 'http://vocab.getty.edu/aat/300054766',
  female: 'http://vocab.getty.edu/aat/300189557',
  intersexual: 'http://vocab.getty.edu/aat/300417544',
  male: 'http://vocab.getty.edu/aat/300189559',
  nationality: 'http://vocab.getty.edu/aat/300379842',
  occupation: 'http://vocab.getty.edu/aat/300263369',
  primaryName: 'https://vocab.getty.edu/aat/300404670',
  typeOfWork: 'http://vocab.getty.edu/aat/300435443',
};

function _getLanguageIdentifierKey(languageCode) {
  return 'lang' + languageCode;
}

function getLanguageIdentifier(languageCode) {
  const key = _getLanguageIdentifierKey(languageCode);
  if (IDENTIFIERS.hasOwnProperty(key)) {
    return IDENTIFIERS[key];
  }
  throw new InternalServerError(
    "A language identifier constant is not defined for the '" +
      languageCode +
      "' language code. Developer to correct the reference or ensure the constant is defined."
  );
}

export { IDENTIFIERS, getLanguageIdentifier };
