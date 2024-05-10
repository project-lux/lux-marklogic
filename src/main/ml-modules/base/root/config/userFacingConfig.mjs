const searchTermText = {
  agent: {
    activeAt: {
      label: 'Professionally Active At',
      helpText:
        'Search for People & Groups that were professionally active in the specified Places.',
    },
    activeDate: {
      label: 'Professionally Active Date',
      helpText:
        'Search for People & Groups by the dates on which they were professionally active.',
    },
    carriedOut: {
      label: 'Carried Out',
      helpText:
        'Search for People & Groups that carried out the specified Event.',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for People & Groups that are categorized with the specified Concept or Type terms.',
    },
    created: {
      label: 'Created Works',
      helpText:
        'Search for People & Groups that authored or created the specified Works.',
    },
    curated: {
      label: 'Curated',
      helpText:
        "Search for Groups responsible for the curation of Yale's collections.",
    },
    encountered: {
      label: 'Encountered',
      helpText:
        'Search for People & Groups that encountered or found the specified Objects',
    },
    endAt: {
      label: 'Died/Dissolved At',
      helpText:
        'Search for People & Groups that died or were dissolved in the specified Place.',
    },
    endDate: {
      label: 'Died/Dissolved Date',
      helpText:
        'Search for People & Groups by the date on which they died or were dissolved.',
    },
    founded: {
      label: 'Founded Group',
      helpText:
        'Search for People who were responsible for the foundation of the specified Groups.',
    },
    foundedBy: {
      label: 'Founded By',
      helpText:
        'Search for Groups by the specified People that were responsible for their foundation.',
    },
    gender: {
      label: 'Gender',
      helpText:
        'Search for People by the specified Gender. This information comes from external sources, and gender information may not match expected results.',
    },
    hasDigitalImage: {
      label: 'Have Digital Image',
      helpText:
        'Search for People & Groups for which digital images are available.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for People & Groups by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/person/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for People & Groups by a string identifier or an external authority URI, such as ULAN, VIAF or wikidata.',
    },
    influenced: {
      label: 'Influenced',
      helpText:
        'Search for People & Groups that influenced the specified Concepts',
    },
    memberOf: {
      label: 'Member of',
      helpText: 'Search for People & Groups that are members of other Groups.',
    },
    memberOfInverse: {
      label: 'Have Member',
      helpText:
        'Search for Groups that have the specified People & Groups as members.',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Person or Group. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    nationality: {
      label: 'Nationality',
      helpText: 'Search for People & Groups with the specified Nationality.',
    },
    occupation: {
      label: 'Occupation',
      helpText: 'Search for a People & Groups with the specified Occupation.',
    },
    produced: {
      label: 'Created Object',
      helpText: 'Search for People & Groups that created the specified Objects',
    },
    published: {
      label: 'Published',
      helpText: 'Search for People & Groups that published the specified Works',
    },
    recordType: {
      label: 'Person or Group',
      helpText:
        'Search only records that are a Person or search only for records that are a Group',
    },
    startAt: {
      label: 'Born/Formed At',
      helpText:
        'Search for People & Groups that were born or formed in the specified Place.',
    },
    startDate: {
      label: 'Born/Formed Date',
      helpText:
        'Search People & Groups by the date on which they were born or formed.',
    },
    subjectOfAgent: {
      label: 'Subject Of',
      helpText:
        'Search for People & Groups that are the subject of the specified Works.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for People & Groups by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
  concept: {
    broader: {
      label: 'Broader Concepts',
      helpText:
        'Search for Concept terms that are hierarchically narrower than the specified broader term.',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Concept and Type terms that are categorized with the specified Concept or Type terms.',
    },
    classificationOfAgent: {
      label: 'Category for People & Groups',
      helpText:
        'Search for Concept and Type terms that are the category of the specified People & Groups.',
    },
    classificationOfConcept: {
      label: 'Category for Concepts',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Concept & Type terms.',
    },
    classificationOfEvent: {
      label: 'Category for Events',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Events.',
    },
    classificationOfItem: {
      label: 'Category for Objects',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Objects.',
    },
    classificationOfPlace: {
      label: 'Category for Places',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Places.',
    },
    classificationOfWork: {
      label: 'Category for Works',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Works.',
    },
    genderOf: {
      label: 'Gender of',
      helpText:
        'Search for Concept terms that describe the Gender of the specified People & Groups. This information comes from external sources, and gender information may not match expected results.',
    },
    hasDigitalImage: {
      label: 'Have Digital Image',
      helpText:
        'Search for Concept and Type terms for which digital images are available.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Concept or Type terms by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/concept/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Concept or Type terms by a string identifier or an external authority URI, such as AAT, LCSH or wikidata.',
    },
    influenced: {
      label: 'Influenced',
      helpText: 'Search for Concepts that influenced the specified Concepts',
    },
    influencedByAgent: {
      label: 'Influenced By People & Groups',
      helpText:
        'Search for Concepts which are influenced by the specified People & Groups',
    },
    influencedByConcept: {
      label: 'Influenced By Concepts',
      helpText:
        'Search for Concepts which are influenced by the specified Concepts',
    },
    influencedByEvent: {
      label: 'Influenced By Events',
      helpText:
        'Search for Concepts which are influenced by the specified Events',
    },
    influencedByPlace: {
      label: 'Influenced By Places',
      helpText:
        'Search for Concepts which are influenced by the specified Places',
    },
    languageOf: {
      label: 'Language of Works',
      helpText:
        'Search for Concept terms that describe the Language of the specified Work.',
    },
    materialOfItem: {
      label: 'Material of',
      helpText:
        'Search for Concepts that are the material of the specified Object (used primarily for art works).',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Concept or Type. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    narrower: {
      label: 'Narrower Concepts',
      helpText:
        'Search for Concept terms that are hierarchically broader than the specified Narrower term.',
    },
    nationalityOf: {
      label: 'Nationality of',
      helpText:
        'Search for Concept terms that describe the Nationality of the specified People & Groups.',
    },
    occupationOf: {
      label: 'Occupation of',
      helpText:
        'Search for Concept terms that describe the Occupation of the specified People & Groups.',
    },
    subjectOfConcept: {
      label: 'Subject Of',
      helpText:
        'Search for Concept & Type terms that are the subject of the specified Works.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Concept & Types by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    usedToProduce: {
      label: 'Technique Of',
      helpText:
        'Search for Concept and Type terms that are the creation technique of the specified Objects',
    },
  },
  event: {
    carriedOutBy: {
      label: 'Carried Out By',
      helpText:
        'Search for Events that were carried out by the specified People & Groups',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Events that are categorized with the specified Concept or Type terms.',
    },
    endDate: {
      label: 'End Date',
      helpText: 'Search for Events by the date on which they ended.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Events by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/activity/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Events by a string identifier, such as an Accession Number, or an external authority URI, such as VIAF or wikidata.',
    },
    influenced: {
      label: 'Influenced',
      helpText: 'Search for Events that influenced the specified Concepts',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Event. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    startDate: {
      label: 'Start Date',
      helpText: 'Search for Events by the date on which they started.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Events by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    tookPlaceAt: {
      label: 'Took Place At',
      helpText: 'Search for Events which occurred at the specified Place.',
    },
    used: {
      label: 'Used',
      helpText: 'Search for Events which used the specified records.',
    },
  },
  item: {
    carries: {
      label: 'Include Works',
      helpText:
        'Search for Objects that include the specified Works. Use this option to include additional criteria from Works records in your search.',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Objects that are categorized with the specified Concept or Type terms.',
    },
    depth: {
      label: 'Dimension: Depth',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's depth dimension. The unit is centimeters.",
    },
    dimension: {
      label: 'Dimension: Any',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against each of the object's dimensions. The unit is centimeters.",
    },
    encounteredAt: {
      label: 'Encountered At',
      helpText:
        'Search for Objects that were encountered or found at the specified Place. This is primarily used for Specimens.',
    },
    encounteredBy: {
      label: 'Encountered By',
      helpText:
        'Search for Objects that were encountered or found by the specified People & Groups. This is primarily used for Specimens.',
    },
    encounteredDate: {
      label: 'Encountered Date',
      helpText:
        'Search for Objects by the date on which they were encountered or found.',
    },
    hasDigitalImage: {
      label: 'Have Digital Image',
      helpText: 'Search for Objects for which digital images are available.',
    },
    height: {
      label: 'Dimension: Height',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's height dimension. The unit is centimeters.",
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Objects by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/object/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Objects by a string identifier or an external authority URI, such as LCSH, BNF or wikidata.',
    },
    isOnline: {
      label: 'Are Online',
      helpText: 'Search for Objects with Online Versions.',
    },
    material: {
      label: 'Material',
      helpText:
        'Search for Objects that are made of the specified Material (used primarily for art works).',
    },
    memberOf: {
      label: 'Member of',
      helpText:
        'Search for Objects that are members of the specified Collection, Exhibition or Archive.',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Object. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    producedAt: {
      label: 'Created At',
      helpText: 'Search for Objects that were created at the specified Places.',
    },
    producedBy: {
      label: 'Created By',
      helpText:
        'Search for Objects that were created by the specified People & Groups.',
    },
    producedDate: {
      label: 'Created Date',
      helpText: 'Search for Objects by the date on which they were created.',
    },
    producedUsing: {
      label: 'Created Using Technique',
      helpText:
        'Search for Objects that were created using the specified Technique.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Objects by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    width: {
      label: 'Dimension: Width',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's width dimension. The unit is centimeters.",
    },
  },
  place: {
    activePlaceOfAgent: {
      label: 'Place of Activity of',
      helpText:
        'Search for Places where the specified People & Groups were professionally active.',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Places that are categorized with the specified Concept or Type terms.',
    },
    createdHere: {
      label: 'Place of Creation Of Works',
      helpText: 'Search for Places where Works were Created.',
    },
    encounteredHere: {
      label: 'Place of Encounter Of',
      helpText:
        'Search for Places where the specified Objects were encountered.',
    },
    endPlaceOfAgent: {
      label: 'Place of Death of',
      helpText:
        'Search for Places where the specified People & Groups died or were dissolved.',
    },
    hasDigitalImage: {
      label: 'Have Digital Image',
      helpText: 'Search for Places for which digital images are available.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Places by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/place/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Places by a string identifier or an external authority URI, such as TGN, Geonames or wikidata.',
    },
    influenced: {
      label: 'Influenced',
      helpText: 'Search for Places that influenced the specified Concepts',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Place. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    partOf: {
      label: 'Part of',
      helpText: 'Search for Places that are within the specified Place.',
    },
    placeOfEvent: {
      label: 'Place of Events',
      helpText: 'Search for Places where the specified Events occurred.',
    },
    producedHere: {
      label: 'Place of Creation Of Objects',
      helpText: 'Search for Places where the specified Objects were created.',
    },
    publishedHere: {
      label: 'Place of Publication Of',
      helpText: 'Search for Places where the specified Works were published.',
    },
    startPlaceOfAgent: {
      label: 'Place of Birth/Formation of',
      helpText: 'Search for Places where People & Groups were born or formed.',
    },
    subjectOfPlace: {
      label: 'Subject Of',
      helpText:
        'Search for Places that are the subject of the specified Works.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Places by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
  set: {
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Collections that are categorized with the specified Concept or Type terms.',
    },
    containingItem: {
      label: 'Containing Objects',
      helpText: 'Search for Collections that contain the specified Objects.',
    },
    containingSet: {
      label: 'Containing Collections',
      helpText:
        'Search for Collections that contain the specified Collections.',
    },
    curatedBy: {
      label: 'Curated By',
      helpText:
        'Search for Collections that are maintained by the specified Groups.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Collections by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/set/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Collections by a string identifier or an external authority URI, such as VIAF or wikidata.',
    },
    memberOf: {
      label: 'Member of',
      helpText:
        'Search for Collections that are hierarchically within the specified Collection.',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Collection. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Collections by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    usedForEvent: {
      label: 'Used for Exhibitions',
      helpText:
        'Search for Collections that record the objects used in the specified Events.',
    },
  },
  work: {
    aboutAgent: {
      label: 'About People & Groups',
      helpText:
        'Search for Works that are about the specified People & Groups.',
    },
    aboutConcept: {
      label: 'About Concepts',
      helpText:
        'Search for Works that are about the specified Concept or Type terms.',
    },
    aboutPlace: {
      label: 'About Places',
      helpText: 'Search for Works that are about the specified Places.',
    },
    carriedBy: {
      label: 'Included In Objects',
      helpText:
        'Search for Works that are included in the specified Objects. Use this option to include criteria from Objects in your search.',
    },
    classification: {
      label: 'Categorized As',
      helpText:
        'Search for Works that are categorized with the specified Concept or Type terms.',
    },
    createdAt: {
      label: 'Created At',
      helpText: 'Search for Works that were created at the specified Places.',
    },
    createdBy: {
      label: 'Created By',
      helpText:
        'Search for Works that were authored or created by the specified People & Groups.',
    },
    createdDate: {
      label: 'Created Date',
      helpText:
        'Search for Works by the date on which they were authored or created. Note the difference with Publication Date.',
    },
    hasDigitalImage: {
      label: 'Have Digital Image',
      helpText: 'Search for Works for which digital images are available.',
    },
    id: {
      label: 'ID',
      helpText:
        'Search for Works by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/text/ and followed by a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'Identifier',
      helpText:
        'Search for Works by a string identifier, such as a call number, or an external authority URI, such as BNF, DNB or wikidata.',
    },
    isOnline: {
      label: 'Are Online',
      helpText: 'Search for Works with Online Versions.',
    },
    language: {
      label: 'Language',
      helpText: 'Search for Works in the specified Language.',
    },
    name: {
      label: 'Name',
      helpText:
        'Enter term(s) to be found within the title or name of the Work. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    publishedAt: {
      label: 'Published At',
      helpText:
        'Search for Works that were published by the specified People & Groups. Note the difference with Creation Place, which is where the text was originally created.',
    },
    publishedBy: {
      label: 'Published By',
      helpText:
        'Search for Works that were published by the specified People & Groups. Note the difference with Creation People & Groups that originally wrote the text or conceived the work.',
    },
    publishedDate: {
      label: 'Published Date',
      helpText:
        'Search for Works by the date on which they were published. Note the difference with Creation Date, which is when the work was originally conceived by its creator.',
    },
    text: {
      label: 'Anywhere',
      helpText:
        'Search for Works by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
};

export { searchTermText };
