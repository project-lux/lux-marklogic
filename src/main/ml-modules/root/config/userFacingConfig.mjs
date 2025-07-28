const searchTermText = {
  agent: {
    activeAt: {
      label: 'were professionally active at',
      helpText:
        'Search for People & Groups that were professionally active in the specified Places.',
    },
    activeDate: {
      label: 'were professionally active on',
      helpText:
        'Search for People & Groups by the dates on which they were professionally active.',
    },
    carriedOut: {
      label: 'carried out',
      helpText:
        'Search for People & Groups that carried out the specified Event.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for People & Groups that are categorized with the specified Concept or Type terms.',
    },
    created: {
      label: 'created',
      helpText:
        'Search for People & Groups that authored or created the specified Works.',
    },
    createdSet: {
      label: 'created',
      helpText:
        'Search for People & Groups that created the specified Collections.',
    },
    curated: {
      label: 'curated',
      helpText:
        "Search for Groups responsible for the curation of Yale's collections.",
    },
    encountered: {
      label: 'encountered',
      helpText:
        'Search for People & Groups that encountered or found the specified Objects.',
    },
    endAt: {
      label: 'died or dissolved at',
      helpText:
        'Search for People & Groups that died or were dissolved in the specified Place.',
    },
    endDate: {
      label: 'died or dissolved on',
      helpText:
        'Search for People & Groups by the date on which they died or were dissolved.',
    },
    founded: {
      label: 'founded',
      helpText:
        'Search for People who were responsible for the foundation of the specified Groups.',
    },
    foundedBy: {
      label: 'were founded by',
      helpText:
        'Search for Groups by the specified People that were responsible for their foundation.',
    },
    gender: {
      label: 'have a gender categorized as',
      helpText:
        'Search for People by the specified Gender. This information comes from external sources, and gender information may not match expected results.',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText:
        'Search for People & Groups for which digital images are available.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for People & Groups by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority identifier of',
      helpText:
        'Search for People & Groups by a string identifier or an external authority URI, such as ULAN, VIAF or wikidata.',
    },
    influenced: {
      label: 'influenced the creation of',
      helpText:
        'Search for People & Groups that influenced the specified Concepts',
    },
    influencedCreation: {
      label: 'influenced the creation of',
      helpText:
        'Search for People & Groups that influenced the creation of the specified Works',
    },
    influencedProduction: {
      label: 'influenced the production of',
      helpText:
        'Search for People & Groups that influenced the creation of the specified Objects',
    },
    memberOf: {
      label: 'are a member of',
      helpText: 'Search for People & Groups that are members of other Groups.',
    },
    memberOfInverse: {
      label: 'include a member',
      helpText:
        'Search for Groups that have the specified People & Groups as members.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Person or Group. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    nationality: {
      label: 'have a nationality categorized as',
      helpText: 'Search for People & Groups with the specified Nationality.',
    },
    occupation: {
      label: 'have an occupation or role categorized as',
      helpText:
        'Search for People & Groups with the specified Occupation or Role.',
    },
    produced: {
      label: 'created',
      helpText:
        'Search for People & Groups that created the specified Objects.',
    },
    professionalActivity: {
      label: 'carried out professional activity categorized as',
      helpText:
        'Search for people and groups that carried out professional activities of the given categorization.',
    },
    published: {
      label: 'published',
      helpText:
        'Search for People & Groups that published the specified Works.',
    },
    publishedSet: {
      label: 'published',
      helpText:
        'Search for People & Groups that published the specified Collections.',
    },
    recordType: {
      label: 'have a person or group class of',
      helpText:
        'Search for records categorized as either a "Person" or a "Group". Person is an individual either real or fictionalized. Group is an organization, either real or fictionalized, with one or more members.',
    },
    startAt: {
      label: 'were born or formed at',
      helpText:
        'Search for People & Groups that were born or formed in the specified Place.',
    },
    startDate: {
      label: 'were born or formed on',
      helpText:
        'Search People & Groups by the date on which they were born or formed.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText:
        'Search for People & Groups that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for People & Groups that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for People & Groups by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
  concept: {
    broader: {
      label: 'are narrower in scope than',
      helpText:
        'Search for Concept terms that are hierarchically narrower than the specified broader term.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Concept and Type terms that are categorized with the specified Concept or Type terms.',
    },
    classificationOfAgent: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified People & Groups.',
    },
    classificationOfConcept: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Concept & Type terms.',
    },
    classificationOfEvent: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Events.',
    },
    classificationOfItem: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Objects.',
    },
    classificationOfPlace: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Places.',
    },
    classificationOfSet: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Collections.',
    },
    classificationOfWork: {
      label: 'are the category of',
      helpText:
        'Search for Concept and Type terms that are the category of the specified Works.',
    },
    genderOf: {
      label: 'are the gender of',
      helpText:
        'Search for Concept terms that describe the Gender of the specified People & Groups. This information comes from external sources, and gender information may not match expected results.',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText:
        'Search for Concept and Type terms for which digital images are available.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Concept or Type terms by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority identifier of',
      helpText:
        'Search for Concept or Type terms by a string identifier or an external authority URI, such as AAT, LCSH or wikidata.',
    },
    influenced: {
      label: 'influenced the creation of',
      helpText: 'Search for Concepts that influenced the specified Concepts.',
    },
    influencedByAgent: {
      label: 'whose creation was influenced by',
      helpText:
        'Search for Concepts which are influenced by the specified People & Groups.',
    },
    influencedByConcept: {
      label: 'whose creation was influenced by',
      helpText:
        'Search for Concepts which are influenced by the specified Concepts.',
    },
    influencedByEvent: {
      label: 'whose creation was influenced by',
      helpText:
        'Search for Concepts which are influenced by the specified Events.',
    },
    influencedByPlace: {
      label: 'whose creation was influenced by',
      helpText:
        'Search for Concepts which are influenced by the specified Places.',
    },
    languageOf: {
      label: 'are the language of',
      helpText:
        'Search for Concept terms that describe the Language of the specified Work.',
    },
    materialOfItem: {
      label: 'are the material of',
      helpText:
        'Search for Concepts that are the material of the specified Object (used primarily for art works).',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Concept or Type. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    narrower: {
      label: 'are broader in scope than',
      helpText:
        'Search for Concept terms that are hierarchically broader than the specified narrower term.',
    },
    nationalityOf: {
      label: 'are the nationality of',
      helpText:
        'Search for Concept terms that describe the Nationality of the specified People & Groups.',
    },
    occupationOf: {
      label: 'are the occupation or role of',
      helpText:
        'Search for Concept terms that describe the Occupation of the specified People & Groups.',
    },
    professionalActivityOf: {
      label: 'are the professional activity of',
      helpText:
        'Search for Concept terms that describe the Professional Activity of the specified People & Groups.',
    },
    recordType: {
      label: 'have a concept class of',
      helpText:
        'Search for records categorized as either a "Measurement Unit", "Language", "Material", "Currency" or a "General Concept". Measurement Units are Concepts that are used as the unit of a measurement, such as inches, seconds, kilograms or bytes. Languages are Concepts that represent human-spoken languages, such as English, Spanish or Latin. Materials are Concepts that represent a class of physical material, such as bronze, paper, or agate. Currencies are Concepts that represent monetary currencies, such as dollars, euros, or francs. General Concepts are Concepts that represent more general ideas or subjects, which excludes the more specific classes of Measurement Unit, Language, Material, and Currency.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText:
        'Search for Concept & Type terms that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for Concept & Type terms that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Concept & Types by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    usedToProduce: {
      label: 'are the technique of',
      helpText:
        'Search for Concept and Type terms that are the creation technique of the specified Objects.',
    },
  },
  event: {
    carriedOutBy: {
      label: 'were carried out by',
      helpText:
        'Search for Events that were carried out by the specified People & Groups.',
    },
    causedCreationOf: {
      label: 'caused the creation of',
      helpText:
        'Search for Events that caused the creation of the specified Works.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Events that are categorized with the specified Concept or Type terms.',
    },
    endDate: {
      label: 'ended on',
      helpText: 'Search for Events by the date on which they ended.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Events by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority identifier of',
      helpText:
        'Search for Events by a string identifier, such as an Accession Number, or an external authority URI, such as VIAF or wikidata.',
    },
    influenced: {
      label: 'influenced the creation of',
      helpText: 'Search for Events that influenced the specified Concepts.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Event. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    recordType: {
      label: 'have an event class of',
      helpText:
        'Search for records categorized as either a "Period" or an "Activity". Periods are Events that have the class of Period, which consists of a Time Period, as opposed to other human-caused activities. Activities are Events that have the class of Activity, which consists of events such as Exhibitions or other collections-related activities.',
    },
    startDate: {
      label: 'started on',
      helpText: 'Search for Events by the date on which they started.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText:
        'Search for Events that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for Events that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Events by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    tookPlaceAt: {
      label: 'took place at',
      helpText: 'Search for Events which occurred at the specified Place.',
    },
    used: {
      label: 'used',
      helpText: 'Search for Events which used the specified records.',
    },
  },
  item: {
    carries: {
      label: 'carry or show',
      helpText:
        'Search for Objects that include the specified Works. Use this option to include additional criteria from Works records in your search.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Objects that are categorized with the specified Concept or Type terms.',
    },
    depth: {
      label: 'have some depth of',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's depth dimension. The unit is centimeters.",
    },
    dimension: {
      label: 'have some dimension of',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against each of the object's dimensions. The unit is centimeters.",
    },
    encounteredAt: {
      label: 'were encountered at',
      helpText:
        'Search for Objects that were encountered or found at the specified Place. This is primarily used for Specimens.',
    },
    encounteredBy: {
      label: 'were encountered by',
      helpText:
        'Search for Objects that were encountered or found by the specified People & Groups. This is primarily used for Specimens.',
    },
    encounteredDate: {
      label: 'were encountered on',
      helpText:
        'Search for Objects by the date on which they were encountered or found.',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText: 'Search for Objects for which digital images are available.',
    },
    height: {
      label: 'have some height of',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's height dimension. The unit is centimeters.",
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Objects by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority URI of',
      helpText:
        'Search for Objects by a string identifier or an external authority URI, such as LCSH, BNF or wikidata.',
    },
    isOnline: {
      label: 'have an online version available',
      helpText: 'Search for Objects with Online Versions.',
    },
    material: {
      label: 'are made of a material',
      helpText:
        'Search for Objects that are made of the specified Material (used primarily for art works).',
    },
    memberOf: {
      label: 'are a member of',
      helpText:
        'Search for Objects that are members of the specified Collection, Exhibition or Archive.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Object. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    producedAt: {
      label: 'were created at',
      helpText: 'Search for Objects that were created at the specified Places.',
    },
    producedBy: {
      label: 'were created by',
      helpText:
        'Search for Objects that were created by the specified People & Groups.',
    },
    producedDate: {
      label: 'were created on',
      helpText: 'Search for Objects by the date on which they were created.',
    },
    producedUsing: {
      label: 'were created using a technique',
      helpText:
        'Search for Objects that were created using the specified Technique.',
    },
    productionInfluencedBy: {
      label: 'have creation influenced by',
      helpText:
        'Search for Objects that were created with influence by the specified Person or Group',
    },
    recordType: {
      label: 'have an object class of',
      helpText:
        'Search for records categorized as either a "Physical Object" or a "Digital Object". Physical Objects are physical items, such as paintings, sculptures, fossils and other specimens, and archival objects. Individual physical copies of books are included in this class. Digital Object are digital items, such as internet resources (datasets, e-books, and other digital files). Digitized images of collection items that are physical objects can be found with the “Is Online” facet on Physical Objects.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText:
        'Search for Objects that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for Objects that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Objects by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    width: {
      label: 'have some width of',
      helpText:
        "Search for Objects by selecting a comparison operator and entering a value to be compared against the object's width dimension. The unit is centimeters.",
    },
  },
  place: {
    activePlaceOfAgent: {
      label: 'are the location of professional activity for',
      helpText:
        'Search for Places where the specified People & Groups were professionally active.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Places that are categorized with the specified Concept or Type terms.',
    },
    createdHere: {
      label: 'are the location of creation of',
      helpText: 'Search for Places where Works were Created.',
    },
    encounteredHere: {
      label: 'are the location of encounter with',
      helpText:
        'Search for Places where the specified Objects were encountered.',
    },
    endPlaceOfAgent: {
      label: 'are the location of death or dissolution of',
      helpText:
        'Search for Places where the specified People & Groups died or were dissolved.',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText: 'Search for Places for which digital images are available.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Places by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority URI of',
      helpText:
        'Search for Places by a string identifier or an external authority URI, such as TGN, Geonames or wikidata.',
    },
    influenced: {
      label: 'influenced the creation of',
      helpText: 'Search for Places that influenced the specified Concepts.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Place. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    partOf: {
      label: 'are within',
      helpText: 'Search for Places that are within the specified Place.',
    },
    placeOfEvent: {
      label: 'are the location of',
      helpText: 'Search for Places where the specified Events occurred.',
    },
    producedHere: {
      label: 'are the location of creation of',
      helpText: 'Search for Places where the specified Objects were created.',
    },
    publishedHere: {
      label: 'are the location of the publication of',
      helpText: 'Search for Places where the specified Works were published.',
    },
    setPublishedHere: {
      label: 'are the location of publication of',
      helpText:
        'Search for Places where the specified Collections were published.',
    },
    startPlaceOfAgent: {
      label: 'are the location of birth or formation of',
      helpText: 'Search for Places where People & Groups were born or formed.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText:
        'Search for Places that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for Places that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Places by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
  set: {
    aboutAgent: {
      label: 'are about',
      helpText:
        'Search for Collections that are about the specified People & Groups.',
    },
    aboutConcept: {
      label: 'are about',
      helpText:
        'Search for Collections that are about the specified Concept or Type terms.',
    },
    aboutEvent: {
      label: 'are about',
      helpText: 'Search for Collections that are about the specified Events.',
    },
    aboutItem: {
      label: 'are about',
      helpText: 'Search for Collections that are about the specified Objects.',
    },
    aboutPlace: {
      label: 'are about',
      helpText: 'Search for Collections that are about the specified Places.',
    },
    aboutWork: {
      label: 'are about',
      helpText: 'Search for Collections that are about the specified Works.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Collections that are categorized with the specified Concept or Type terms.',
    },
    createdAt: {
      label: 'were created at',
      helpText:
        'Search for Collections that were created at the specified Places.',
    },
    createdBy: {
      label: 'were created by',
      helpText:
        'Search for Collections that were created by the specified People & Groups.',
    },
    createdDate: {
      label: 'were created on',
      helpText:
        'Search for Collections by the date on which they were created. Note the difference with Publication Date.',
    },
    creationCausedBy: {
      label: 'have a creation caused by',
      helpText:
        'Search for Collections that were created because of the specified Events.',
    },
    containingItem: {
      label: 'contain',
      helpText: 'Search for Collections that contain the specified Objects.',
    },
    containingSet: {
      label: 'contain',
      helpText:
        'Search for Collections that contain the specified Collections.',
    },
    curatedBy: {
      label: 'are curated by',
      helpText:
        'Search for Collections that are maintained by the specified Groups.',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText:
        'Search for Collections for which digital images are available.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Collections by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority URI of',
      helpText:
        'Search for Collections by a string identifier or an external authority URI, such as VIAF or wikidata.',
    },
    lastModifiedBy: {
      label: 'last modified by',
      helpText:
        'Search for Collections by the People & Groups who last modified them.',
    },
    lastModifiedDate: {
      label: 'last modified on',
      helpText:
        'Search for Collections by the date on which they were last modified.',
    },
    memberOf: {
      label: 'are a member of',
      helpText:
        'Search for Collections that are hierarchically within the specified Collection.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Collection. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    publishedAt: {
      label: 'were published at',
      helpText:
        'Search for Collections that were published at the specified Place. Note the difference with Creation Place, which is where the text was originally created.',
    },
    publishedBy: {
      label: 'were published by',
      helpText:
        'Search for Collections that were published by the specified People & Groups. Note the difference with Creation People & Groups that originally wrote the text or conceived the Collection.',
    },
    publishedDate: {
      label: 'were published on',
      helpText:
        'Search for Collections by the date on which they were published. Note the difference with Creation Date, which is when the collection was originally conceived by its creator.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Collections by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    usedForEvent: {
      label: 'were used for',
      helpText:
        'Search for Collections that record the objects used in the specified Events.',
    },
  },
  work: {
    aboutAgent: {
      label: 'are about',
      helpText:
        'Search for Works that are about the specified People & Groups.',
    },
    aboutConcept: {
      label: 'are about',
      helpText:
        'Search for Works that are about the specified Concept or Type terms.',
    },
    aboutEvent: {
      label: 'are about',
      helpText: 'Search for Works that are about the specified Events.',
    },
    aboutItem: {
      label: 'are about',
      helpText: 'Search for Works that are about the specified Objects.',
    },
    aboutPlace: {
      label: 'are about',
      helpText: 'Search for Works that are about the specified Places.',
    },
    aboutWork: {
      label: 'are about',
      helpText: 'Search for Works that are about the specified Works.',
    },
    carriedBy: {
      label: 'are carried or shown by',
      helpText:
        'Search for Works that are included in the specified Objects. Use this option to include criteria from Objects in your search.',
    },
    classification: {
      label: 'are categorized as',
      helpText:
        'Search for Works that are categorized with the specified Concept or Type terms.',
    },
    containsWork: {
      label: 'contain',
      helpText: 'Search for Works that contain the specified Works.',
    },
    createdAt: {
      label: 'were created at',
      helpText: 'Search for Works that were created at the specified Places.',
    },
    createdBy: {
      label: 'were created by',
      helpText:
        'Search for Works that were authored or created by the specified People & Groups.',
    },
    createdDate: {
      label: 'were created on',
      helpText:
        'Search for Works by the date on which they were authored or created. Note the difference with Publication Date.',
    },
    creationCausedBy: {
      label: 'have a creation caused by',
      helpText:
        'Search for Works that were created because of the specified Events.',
    },
    creationInfluencedBy: {
      label: 'have a creation influenced by',
      helpText:
        'Search for Works that were created with influence by the specified Person or Group',
    },
    hasDigitalImage: {
      label: 'have a digital image available',
      helpText: 'Search for Works for which digital images are available.',
    },
    id: {
      label: 'have a LUX URI of',
      helpText:
        'Search for Works by their LUX data URI (e.g. starting with https://lux.collections.yale.edu/data/ and followed by a URI path containing a UUID, not the URI with /view/ in it).',
    },
    identifier: {
      label: 'have an external authority URI of',
      helpText:
        'Search for Works by a string identifier, such as a call number, or an external authority URI, such as BNF, DNB or wikidata.',
    },
    isOnline: {
      label: 'have an online version available',
      helpText: 'Search for Works with Online Versions.',
    },
    isPublicDomain: {
      label: 'are in the public domain',
      helpText:
        'Search for Works that have been identified as public domain/no copyright materials. Note that this only applies to materials from the Yale University Art Gallery and Yale Center for British Art collections at this time. For copyright questions or more information about rights and re-use of content found in LUX, please contact the appropriate museum or library or consult the Rights and Usage Frequently Asked Questions(Advanced Search Help) linked below.',
    },
    language: {
      label: 'have a language of',
      helpText: 'Search for Works in the specified Language.',
    },
    name: {
      label: 'are named',
      helpText:
        'Enter term(s) to be found within the title or name of the Work. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
    partOfWork: {
      label: 'are a part of',
      helpText: 'Search for Works that are part of the specified Works.',
    },
    publishedAt: {
      label: 'were published at',
      helpText:
        'Search for Works that were published at the specified Place. Note the difference with Creation Place, which is where the text was originally created.',
    },
    publishedBy: {
      label: 'were published by',
      helpText:
        'Search for Works that were published by the specified People & Groups. Note the difference with Creation People & Groups that originally wrote the text or conceived the work.',
    },
    publishedDate: {
      label: 'were published on',
      helpText:
        'Search for Works by the date on which they were published. Note the difference with Creation Date, which is when the work was originally conceived by its creator.',
    },
    recordType: {
      label: 'have a work class of',
      helpText:
        'Search for records categorized as either a "Visual Work" or a "Textual Work. Visual Works are Works that are primarily visual, such as the images shown by paintings or photographs, sculptures, or other non language oriented creative expressions. Textual Works are Works that are primarily textual or otherwise convey information via human language. An Object may include both visual and textual works, such as a poster with graphics and text. In addition, Textual Works encompasses most items from the Library collections, including posters, artworks, musical scores, video and sound recordings.',
    },
    subjectOfWork: {
      label: 'are the subject of',
      helpText: 'Search for Works that are the subject of the specified Works.',
    },
    subjectOfSet: {
      label: 'are the subject of',
      helpText:
        'Search for Works that are the subject of the specified Collections.',
    },
    text: {
      label: 'contain, anywhere in the record',
      helpText:
        'Search for Works by terms anywhere in the record. "AND", "OR", and "-" do not have special meaning in Advanced Search as they do in Simple Search. Instead use multiple fields connected with "have All of", "have Any of", and "have None of" respectively.',
    },
  },
};

export { searchTermText };
