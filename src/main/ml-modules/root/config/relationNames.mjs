import * as utils from '../utils/utils.mjs';

const RELATION_NAMES = {
  'classificationOfItem-classification':
    'Is the Category of Objects Categorized As',
  'classificationOfItem-encounteredAt':
    'Is the Category of Objects Encountered At',
  'classificationOfItem-encounteredBy':
    'Is the Category of Objects Encountered By',
  'classificationOfItem-material': 'Is the Category of Objects Made Of',
  'classificationOfItem-memberOf-usedForEvent':
    'Is the Category of Objects Used At',
  'classificationOfItem-producedAt': 'Is the Category of Objects Created At',
  'classificationOfItem-producedBy': 'Is the Category of Objects Created By',
  'classificationOfItem-producedUsing':
    'Is the Category of Objects Created Using',
  'classificationOfWork-aboutAgent': 'Is the Category of Works About',
  'classificationOfWork-aboutConcept': 'Is the Category of Works About',
  'classificationOfWork-aboutPlace': 'Is the Category of Works About',
  'classificationOfWork-carriedBy-memberOf-usedForEvent':
    'Is the Category of Works Carried By Objects Used At',
  'classificationOfWork-classification':
    'Is the Category of Works Categorized As',
  'classificationOfWork-createdAt': 'Is the Category of Works Created At',
  'classificationOfWork-createdBy': 'Is the Category of Works Created By',
  'classificationOfWork-language': 'Is the Category of Works In',
  'classificationOfWork-publishedBy': 'Is the Category of Works Published By',
  'classificationOfSet-aboutAgent': 'Is the Category of Collections About',
  'classificationOfSet-aboutConcept': 'Is the Category of Collections About',
  'classificationOfSet-aboutPlace': 'Is the Category of Collections About',
  'classificationOfSet-classification':
    'Is the Category of Collections Categorized As',
  'classificationOfSet-createdAt': 'Is the Category of Collections Created At',
  'classificationOfSet-createdBy': 'Is the Category of Collections Created By',
  'classificationOfSet-publishedBy':
    'Is the Category of Collections Published By',
  'created-aboutAgent': 'Created Works About',
  'created-aboutItem-memberOf-usedForEvent':
    'Created Works About Objects Used At',
  'created-aboutConcept': 'Created Works About',
  'created-aboutPlace': 'Created Works About',
  'createdSet-aboutAgent': 'Created Collections About',
  'createdSet-aboutConcept': 'Created Collections About',
  'createdSet-aboutPlace': 'Created Collections About',
  'created-carriedBy-memberOf-usedForEvent':
    'Created Works Carried by Objects Used At',
  'created-classification': 'Created Works Categorized As',
  'created-createdAt': 'Created Works Created At',
  'created-createdBy': 'Co-created Works With',
  'created-creationInfluencedBy': 'Created Works Influenced By',
  'created-language': 'Created Works In',
  'created-publishedBy': 'Created Works Published By',
  'createdSet-classification': 'Created Collections Categorized As',
  'createdSet-createdAt': 'Created Collections Created At',
  'createdSet-createdBy': 'Co-created Collections With',
  'createdSet-publishedBy': 'Created Collections Published By',
  'createdHere-aboutAgent': 'Is the Place of Creation of Works About',
  'createdHere-aboutConcept': 'Is the Place of Creation of Works About',
  'createdHere-aboutPlace': 'Is the Place of Creation of Works About',
  'createdHere-carriedBy-memberOf-usedForEvent':
    'Is the Place of Creation of Works Carried By Items Used At',
  'createdHere-classification':
    'Is the Place of Creation of Works Categorized As',
  'createdHere-createdAt': 'Is the Place of Creation of Works Created At',
  'createdHere-createdBy': 'Is the Place of Creation of Works Created By',
  'createdHere-language': 'Is the Place of Creation of Works In',
  'createdHere-publishedBy': 'Is the Place of Creation of Works Published By',
  'encountered-classification': 'Encountered Objects Categorized As',
  'encountered-encounteredAt': 'Encountered Objects Encountered At',
  'encountered-encounteredBy': 'Co-encountered Objects With',
  'encountered-material': 'Encountered Objects Made Of',
  'encountered-producedAt': 'Encountered Objects Created At',
  'encountered-producedBy': 'Encountered Objects Created By',
  'encountered-producedUsing': 'Encountered Objects Created Using',
  'encountered-productionInfluencedBy': 'Encountered Objects Influenced By',
  'encounteredHere-classification':
    'Is the Place of Encounter of Objects Categorized As',
  'encounteredHere-encounteredAt':
    'Is the Place of Encounter of Objects Encountered At',
  'encounteredHere-encounteredBy':
    'Is the Place of Encounter of Objects Encountered By',
  'encounteredHere-material': 'Is the Place of Encounter of Objects Made Of',
  'encounteredHere-memberOf-usedForEvent':
    'Is the Place of Encounter of Objects Used At',
  'encounteredHere-producedAt':
    'Is the Place of Encounter of Objects Created At',
  'encounteredHere-producedBy':
    'Is the Place of Encounter of Objects Created By',
  'encounteredHere-producedUsing':
    'Is the Place of Encounter of Objects Created Using',
  'encountered-memberOf-usedForEvent': 'Encountered Objects Used At',
  'influencedCreation-aboutAgent': 'Influenced Creation of Works About',
  'influencedCreation-aboutConcept': 'Influenced Creation of Works About',
  'influencedCreation-aboutEvent': 'Influenced Creation of Works About',
  'influencedCreation-aboutItem-carries-aboutEvent':
    'Influenced Creation of Works About',
  'influencedCreation-aboutItem-carries-creationCausedBy':
    'Influenced Creation of Works About',
  'influencedCreation-createdBy': 'Influenced Creation of Works Created By',
  'influencedCreation-creationInfluencedBy':
    'Influenced Creation of Works Influenced By',
  'influencedCreation-classification':
    'Influenced Creation of Works Categorized As',
  'influencedCreation-language': 'Influenced Creation of Works In',
  'influencedCreation-publishedBy': 'Influenced Creation of Works Published By',
  'influencedProduction-classification':
    'Influenced Creation of Objects Categorized As',
  'influencedProduction-encounteredBy':
    'Influenced Creation of Objects Encountered By',
  'influencedProduction-material': 'Influenced Creation of Objects Made Of',
  'influencedProduction-producedBy':
    'Influenced Creation of Objects Created By',
  'influencedProduction-producedUsing':
    'Influenced Creation of Objects Created Using',
  'influencedProduction-productionInfluencedBy':
    'Influenced Creation of Objects Influenced By',
  'languageOf-aboutAgent': 'Is the Language of Works About',
  'languageOf-aboutConcept': 'Is the Language of Works About',
  'languageOf-aboutPlace': 'Is the Language of Works About',
  'languageOf-carriedBy-memberOf-usedForEvent':
    'Is the Language of Works Carried by Objects Used At',
  'languageOf-classification': 'Is the Language of Works Categorized As',
  'languageOf-createdAt': 'Is the Language of Works Created At',
  'languageOf-createdBy': 'Is the Language of Works Created By',
  'languageOf-language': 'Is the Language of Works In',
  'languageOf-publishedBy': 'Is the Language of Works Published By',
  'materialOfItem-classification': 'Is the Material of Objects Categorized As',
  'materialOfItem-encounteredAt': 'Is the Material of Objects Encountered At',
  'materialOfItem-encounteredBy': 'Is the Material of Objects Encountered By',
  'materialOfItem-material': 'Is the Material of Objects Made Of',
  'materialOfItem-memberOf-usedForEvent': 'Is the Material of Objects Used At',
  'materialOfItem-producedAt': 'Is the Material of Objects Created At',
  'materialOfItem-producedBy': 'Is the Material of Objects Created By',
  'materialOfItem-producedUsing': 'Is the Material of Objects Created Using',
  'produced-classification': 'Created Objects Categorized As',
  'produced-encounteredAt': 'Created Objects Encountered At',
  'produced-encounteredBy': 'Created Objects Encountered By',
  'produced-material': 'Created Objects Made Of',
  'produced-memberOf-usedForEvent': 'Produced Objects Used At',
  'produced-producedAt': 'Created Objects Created At',
  'produced-producedBy': 'Co-created Objects With',
  'produced-producedUsing': 'Created Objects Using',
  'produced-productionInfluencedBy': 'Created Objects Influenced By',
  'producedHere-classification':
    'Is the Place of Creation of Objects Categorized As',
  'producedHere-encounteredAt':
    'Is the Place of Creation of Objects Encountered At',
  'producedHere-encounteredBy':
    'Is the Place of Creation of Objects Encountered By',
  'producedHere-material': 'Is the Place of Creation of Objects Made Of',
  'producedHere-memberOf-usedForEvent':
    'Is the Place of Creation of Objects Used At',
  'producedHere-producedAt': 'Is the Place of Creation of Objects Created At',
  'producedHere-producedBy': 'Is the Place of Creation of Objects Created By',
  'producedHere-producedUsing':
    'Is the Place of Creation of Objects Created Using',
  'published-aboutAgent': 'Published Works About',
  'published-aboutConcept': 'Published Works About',
  'published-aboutPlace': 'Published Works About',
  'published-carriedBy-memberOf-usedForEvent':
    'Published Works Carried by Objects Used At',
  'published-classification': 'Published Works Categorized As',
  'published-createdAt': 'Published Works Created At',
  'published-createdBy': 'Published Works Created By',
  'published-creationInfluencedBy': 'Published Works Influenced By',
  'published-language': 'Published Works In',
  'published-publishedBy': 'Published Works With',
  'setCreatedHere-aboutAgent': 'Is the Place of Creation of Collections About',
  'setCreatedHere-aboutConcept':
    'Is the Place of Creation of Collections About',
  'setCreatedHere-aboutPlace': 'Is the Place of Creation of Collections About',
  'setCreatedHere-carriedBy-memberOf-usedForEvent':
    'Is the Place of Creation of Collections Carried By Items Used At',
  'setCreatedHere-classification':
    'Is the Place of Creation of Collections Categorized As',
  'setCreatedHere-createdAt':
    'Is the Place of Creation of Collections Created At',
  'setCreatedHere-createdBy':
    'Is the Place of Creation of Collections Created By',
  'setCreatedHere-publishedBy':
    'Is the Place of Creation of Collections Published By',
  'subjectOfWork-aboutAgent': 'Is the Subject of Works About',
  'subjectOfWork-aboutConcept': 'Is the Subject of Works About',
  'subjectOfWork-aboutPlace': 'Is the Subject of Works About',
  'subjectOfWork-carriedBy-memberOf-usedForEvent':
    'Is the Subject of Works Carried by Objects Used At',
  'subjectOfWork-classification': 'Is the Subject of Works Categorized As',
  'subjectOfWork-createdAt': 'Is the Subject of Works Created At',
  'subjectOfWork-createdBy': 'Is the Subject of Works Created By',
  'subjectOfWork-creationInfluencedBy': 'Is the Subject of Works Influenced By',
  'subjectOfWork-language': 'Is the Subject of Works In',
  'subjectOfWork-publishedBy': 'Is the Subject of Works Published By',
  'subjectOfSet-aboutAgent': 'Is the Subject of Collections About',
  'subjectOfSet-aboutConcept': 'Is the Subject of Collections About',
  'subjectOfSet-aboutPlace': 'Is the Subject of Collections About',
  'subjectOfSet-classification': 'Is the Subject of Collections Categorized As',
  'subjectOfSet-createdAt': 'Is the Subject of Collections Created At',
  'subjectOfSet-createdBy': 'Is the Subject of Collections Created By',
  'subjectOfSet-language': 'Is the Subject of Collections In',
  'subjectOfSet-publishedBy': 'Is the Subject of Collections Published By',
  'usedToProduce-classification': 'Is the Technique of Objects Categorized As',
  'usedToProduce-encounteredAt': 'Is the Technique of Objects Encountered At',
  'usedToProduce-encounteredBy': 'Is the Technique of Objects Encountered By',
  'usedToProduce-material': 'Is the Technique of Objects Made Of',
  'usedToProduce-memberOf-usedForEvent': 'Is the Technique of Objects Used At',
  'usedToProduce-producedAt': 'Is the Technique of Objects Created At',
  'usedToProduce-producedBy': 'Is the Technique of Objects Created By',
  'usedToProduce-producedUsing': 'Is the Technique of Objects Created Using',
};

function getRelationName(relationKey) {
  if (RELATION_NAMES[relationKey]) {
    return RELATION_NAMES[relationKey];
  }
  const idx = relationKey.indexOf('-');
  const firstTerm = idx > -1 ? relationKey.substring(0, idx) : relationKey;
  return utils.uppercaseFirstCharacter(utils.camelCaseToWords(firstTerm));
}

export { RELATION_NAMES, getRelationName };
