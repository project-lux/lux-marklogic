import * as utils from '../utils/utils.mjs';
import { TRACE_NAME_RELATED_LIST as traceName } from '../lib/appConstants.mjs';

const RELATION_NAMES = {
  'classificationOfItem-classification':
    'Is the Category of Objects Categorized As',
  'classificationOfItem-encounteredAt':
    'Is the Category of Objects Encountered At',
  'classificationOfItem-encounteredBy':
    'Is the Category of Objects Encountered By',
  'classificationOfItem-material': 'Is the Category of Objects Made Of',
  'classificationOfItem-producedAt': 'Is the Category of Objects Created At',
  'classificationOfItem-producedBy': 'Is the Category of Objects Created By',
  'classificationOfItem-producedUsing':
    'Is the Category of Objects Created Using',
  'classificationOfItem-productionInfluencedBy':
    'Is the Category of Objects Influenced By',
  'classificationOfSet-aboutAgent': 'Is the Category of Collections About',
  'classificationOfSet-aboutConcept': 'Is the Category of Collections About',
  'classificationOfSet-aboutEvent': 'Is the Category of Collections About',
  'classificationOfSet-aboutPlace': 'Is the Category of Collections About',
  'classificationOfSet-classification':
    'Is the Category of Collections Categorized As',
  'classificationOfSet-createdAt': 'Is the Category of Collections Created At',
  'classificationOfSet-createdBy': 'Is the Category of Collections Created By',
  'classificationOfSet-creationCausedBy':
    'Is the Category of Collections Caused By',
  'classificationOfSet-creationInfluencedBy':
    'Is the Category of Collections Influenced By',
  'classificationOfSet-curatedBy': 'Is the Category of Collections Curated By',
  'classificationOfSet-publishedAt':
    'Is the Category of Collections Published At',
  'classificationOfSet-publishedBy':
    'Is the Category of Collections Published By',
  'classificationOfWork-aboutAgent': 'Is the Category of Works About',
  'classificationOfWork-aboutConcept': 'Is the Category of Works About',
  'classificationOfWork-aboutEvent': 'Is the Category of Works About',
  'classificationOfWork-aboutPlace': 'Is the Category of Works About',
  'classificationOfWork-classification':
    'Is the Category of Works Categorized As',
  'classificationOfWork-createdAt': 'Is the Category of Works Created At',
  'classificationOfWork-createdBy': 'Is the Category of Works Created By',
  'classificationOfWork-creationCausedBy': 'Is the Category of Works Caused By',
  'classificationOfWork-creationInfluencedBy':
    'Is the Category of Works Influenced By',
  'classificationOfWork-language': 'Is the Category of Works In',
  'classificationOfWork-publishedBy': 'Is the Category of Works Published By',
  'created-aboutAgent': 'Created Works About',
  'created-aboutConcept': 'Created Works About',
  'created-aboutEvent': 'Created Works About',
  'created-aboutPlace': 'Created Works About',
  'created-classification': 'Created Works Categorized As',
  'created-createdAt': 'Created Works Created At',
  'created-createdBy': 'Co-created Works With',
  'created-creationCausedBy': 'Created Works Caused By',
  'created-creationInfluencedBy': 'Created Works Influenced By',
  'created-language': 'Created Works In',
  'created-publishedBy': 'Created Works Published By',
  'createdHere-aboutAgent': 'Is the Place of Creation of Works About',
  'createdHere-aboutConcept': 'Is the Place of Creation of Works About',
  'createdHere-aboutEvent': 'Is the Place of Creation of Works About',
  'createdHere-aboutPlace': 'Is the Place of Creation of Works About',
  'createdHere-classification':
    'Is the Place of Creation of Works Categorized As',
  'createdHere-createdAt': 'Is the Place of Creation of Works Created At',
  'createdHere-createdBy': 'Is the Place of Creation of Works Created By',
  'createdHere-creationCausedBy': 'Is the Place of Creation of Works Caused By',
  'createdHere-creationInfluencedBy':
    'Is the Place of Creation of Works Influenced By',
  'createdHere-language': 'Is the Place of Creation of Works In',
  'createdHere-publishedBy': 'Is the Place of Creation of Works Published By',
  'createdSet-aboutAgent': 'Created Collections About',
  'createdSet-aboutConcept': 'Created Collections About',
  'createdSet-aboutEvent': 'Created Collections About',
  'createdSet-aboutPlace': 'Created Collections About',
  'createdSet-classification': 'Created Collections Categorized As',
  'createdSet-createdAt': 'Created Collections Created At',
  'createdSet-createdBy': 'Co-created Collections With',
  'createdSet-creationCausedBy': 'Created Collections Caused By',
  'createdSet-creationInfluencedBy': 'Created Collections Influenced By',
  'createdSet-curatedBy': 'Created Collections Curated By',
  'createdSet-publishedAt': 'Created Collections Published At',
  'createdSet-publishedBy': 'Created Collections Published By',
  'createdSet-usedForEvent': 'Created Collections Used For',
  'curated-aboutAgent': 'Curated Collections About',
  'curated-aboutConcept': 'Curated Collections About',
  'curated-aboutEvent': 'Curated Collections About',
  'curated-aboutPlace': 'Curated Collections About',
  'curated-classification': 'Curated Collections Categorized As',
  'curated-createdAt': 'Curated Collections Created At',
  'curated-createdBy': 'Curated Collections Created By',
  'curated-creationCausedBy': 'Curated Collections Caused By',
  'curated-creationInfluencedBy': 'Curated Collections Influenced By',
  'curated-curatedBy': 'Curated Collections Curated By',
  'curated-publishedAt': 'Curated Collections Published At',
  'curated-publishedBy': 'Curated Collections Published By',
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
  'encounteredHere-producedAt':
    'Is the Place of Encounter of Objects Created At',
  'encounteredHere-producedBy':
    'Is the Place of Encounter of Objects Created By',
  'encounteredHere-producedUsing':
    'Is the Place of Encounter of Objects Created Using',
  'encounteredHere-productionInfluencedBy':
    'Is the Place of Encounter of Objects Influenced By',
  'influencedCreation-aboutAgent': 'Influenced Creation of Works About',
  'influencedCreation-aboutConcept': 'Influenced Creation of Works About',
  'influencedCreation-aboutEvent': 'Influenced Creation of Works About',
  'influencedCreation-aboutPlace': 'Influenced Creation of Works About',
  'influencedCreation-classification':
    'Influenced Creation of Works Categorized As',
  'influencedCreation-createdAt': 'Influenced Creation of Works Created At',
  'influencedCreation-createdBy': 'Influenced Creation of Works Created By',
  'influencedCreation-creationCausedBy':
    'Influenced Creation of Works Caused By',
  'influencedCreation-creationInfluencedBy':
    'Influenced Creation of Works Influenced By',
  'influencedCreation-language': 'Influenced Creation of Works In',
  'influencedCreation-publishedAt': 'Influenced Creation of Works Published At',
  'influencedCreation-publishedBy': 'Influenced Creation of Works Published By',
  'influencedCreationSet-aboutAgent':
    'Influenced Creation of Collections About',
  'influencedCreationSet-aboutConcept':
    'Influenced Creation of Collections About',
  'influencedCreationSet-aboutEvent':
    'Influenced Creation of Collections About',
  'influencedCreationSet-aboutPlace':
    'Influenced Creation of Collections About',
  'influencedCreationSet-classification':
    'Influenced Creation of Collections Categorized As',
  'influencedCreationSet-createdAt':
    'Influenced Creation of Collections Created At',
  'influencedCreationSet-createdBy':
    'Influenced Creation of Collections Created By',
  'influencedCreationSet-creationCausedBy':
    'Influenced Creation of Collections Caused By',
  'influencedCreationSet-creationInfluencedBy':
    'Influenced Creation of Collections Influenced By',
  'influencedCreationSet-curatedBy':
    'Influenced Creation of Collections Curated By',
  'influencedCreationSet-publishedAt':
    'Influenced Creation of Collections Published At',
  'influencedCreationSet-publishedBy':
    'Influenced Creation of Collections Published By',
  'influencedCreationSet-usedForEvent':
    'Influenced Creation of Collections Used For Event',
  'influencedProduction-classification':
    'Influenced Creation of Objects Categorized As',
  'influencedProduction-encounteredAt':
    'Influenced Creation of Objects Encountered At',
  'influencedProduction-encounteredBy':
    'Influenced Creation of Objects Encountered By',
  'influencedProduction-material': 'Influenced Creation of Objects Made Of',
  'influencedProduction-producedAt':
    'Influenced Creation of Objects Created At',
  'influencedProduction-producedBy':
    'Influenced Creation of Objects Created By',
  'influencedProduction-producedUsing':
    'Influenced Creation of Objects Created Using',
  'influencedProduction-productionInfluencedBy':
    'Influenced Creation of Objects Influenced By',
  'languageOf-aboutAgent': 'Is the Language of Works About',
  'languageOf-aboutConcept': 'Is the Language of Works About',
  'languageOf-aboutEvent': 'Is the Language of Works About',
  'languageOf-aboutPlace': 'Is the Language of Works About',
  'languageOf-classification': 'Is the Language of Works Categorized As',
  'languageOf-createdAt': 'Is the Language of Works Created At',
  'languageOf-createdBy': 'Is the Language of Works Created By',
  'languageOf-creationCausedBy': 'Is the Language of Works Caused By',
  'languageOf-creationInfluencedBy': 'Is the Language of Works Influenced By',
  'languageOf-language': 'Is the Language of Works In',
  'languageOf-publishedBy': 'Is the Language of Works Published By',
  'materialOfItem-classification': 'Is the Material of Objects Categorized As',
  'materialOfItem-encounteredAt': 'Is the Material of Objects Encountered At',
  'materialOfItem-encounteredBy': 'Is the Material of Objects Encountered By',
  'materialOfItem-material': 'Is the Material of Objects Made Of',
  'materialOfItem-producedAt': 'Is the Material of Objects Created At',
  'materialOfItem-producedBy': 'Is the Material of Objects Created By',
  'materialOfItem-producedUsing': 'Is the Material of Objects Created Using',
  'materialOfItem-productionInfluencedBy':
    'Is the Material of Objects Influenced By',
  'produced-classification': 'Created Objects Categorized As',
  'produced-encounteredAt': 'Created Objects Encountered At',
  'produced-encounteredBy': 'Created Objects Encountered By',
  'produced-material': 'Created Objects Made Of',
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
  'producedHere-producedAt': 'Is the Place of Creation of Objects Created At',
  'producedHere-producedBy': 'Is the Place of Creation of Objects Created By',
  'producedHere-producedUsing':
    'Is the Place of Creation of Objects Created Using',
  'producedHere-productionInfluencedBy':
    'Is the Place of Creation of Objects Influenced By',
  'published-aboutAgent': 'Published Works About',
  'published-aboutConcept': 'Published Works About',
  'published-aboutEvent': 'Published Works About',
  'published-aboutPlace': 'Published Works About',
  'published-classification': 'Published Works Categorized As',
  'published-createdAt': 'Published Works Created At',
  'published-createdBy': 'Published Works Created By',
  'published-creationCausedBy': 'Published Works Caused By',
  'published-creationInfluencedBy': 'Published Works Influenced By',
  'published-language': 'Published Works In',
  'published-publishedBy': 'Published Works With',
  'publishedHere-aboutEvent': 'Is the Place of Publication of Works About',
  'publishedHere-creationCausedBy':
    'Is the Place of Publication of Works Caused By',
  'publishedHere-creationInfluencedBy':
    'Is the Place of Publication of Works Influenced By',
  'publishedSet-aboutAgent': 'Published Collections About',
  'publishedSet-aboutConcept': 'Published Collections About',
  'publishedSet-aboutEvent': 'Published Collections About',
  'publishedSet-aboutPlace': 'Published Collections About',
  'publishedSet-classification': 'Published Collections Categorized As',
  'publishedSet-createdAt': 'Published Collections Created At',
  'publishedSet-createdBy': 'Published Collections Created By',
  'publishedSet-creationCausedBy': 'Published Collections Caused By',
  'publishedSet-creationInfluencedBy': 'Published Collections Influenced By',
  'publishedSet-curatedBy': 'Published Collections Curated By',
  'publishedSet-publishedAt': 'Published Collections Published At',
  'publishedSet-publishedBy': 'Published Collections Published By',
  'publishedSet-usedForEvent': 'Published Collections Used For',
  'setCreatedHere-aboutAgent': 'Is the Place of Creation of Collections About',
  'setCreatedHere-aboutConcept':
    'Is the Place of Creation of Collections About',
  'setCreatedHere-aboutEvent': 'Is the Place of Creation of Collections About',
  'setCreatedHere-aboutPlace': 'Is the Place of Creation of Collections About',
  'setCreatedHere-classification':
    'Is the Place of Creation of Collections Categorized As',
  'setCreatedHere-createdAt':
    'Is the Place of Creation of Collections Created At',
  'setCreatedHere-createdBy':
    'Is the Place of Creation of Collections Created By',
  'setCreatedHere-creationCausedBy':
    'Is the Place of Creation of Collections Caused By',
  'setCreatedHere-creationInfluencedBy':
    'Is the Place of Creation of Collections Influenced By',
  'setCreatedHere-curatedBy':
    'Is the Place of Creation of Collections Curated By',
  'setCreatedHere-publishedAt':
    'Is the Place of Creation of Collections Published At',
  'setCreatedHere-publishedBy':
    'Is the Place of Creation of Collections Published By',
  'setCreatedHere-usedForEvent':
    'Is the Place of Creation of Collections Used For',
  'setPublishedHere-aboutAgent':
    'Is the Place of Publication of Collections About',
  'setPublishedHere-aboutConcept':
    'Is the Place of Publication of Collections About',
  'setPublishedHere-aboutEvent':
    'Is the Place of Publication of Collections About',
  'setPublishedHere-aboutPlace':
    'Is the Place of Publication of Collections About',
  'setPublishedHere-classification':
    'Is the Place of Publication of Collections Categorized As',
  'setPublishedHere-createdAt':
    'Is the Place of Publication of Collections Created At',
  'setPublishedHere-createdBy':
    'Is the Place of Publication of Collections Created By',
  'setPublishedHere-creationCausedBy':
    'Is the Place of Publication of Collections Caused By',
  'setPublishedHere-creationInfluencedBy':
    'Is the Place of Publication of Collections Influenced By',
  'setPublishedHere-curatedBy':
    'Is the Place of Publication of Collections Curated By',
  'setPublishedHere-publishedAt':
    'Is the Place of Publication of Collections Published At',
  'setPublishedHere-publishedBy':
    'Is the Place of Publication of Collections Published By',
  'setPublishedHere-usedForEvent':
    'Is the Place of Publication of Collections Used For',
  'subjectOfSet-aboutAgent': 'Is the Subject of Collections About',
  'subjectOfSet-aboutConcept': 'Is the Subject of Collections About',
  'subjectOfSet-aboutEvent': 'Is the Subject of Collections About',
  'subjectOfSet-aboutPlace': 'Is the Subject of Collections About',
  'subjectOfSet-classification': 'Is the Subject of Collections Categorized As',
  'subjectOfSet-createdAt': 'Is the Subject of Collections Created At',
  'subjectOfSet-createdBy': 'Is the Subject of Collections Created By',
  'subjectOfSet-creationCausedBy': 'Is the Subject of Collections Caused By',
  'subjectOfSet-creationInfluencedBy':
    'Is the Subject of Collections Influenced By',
  'subjectOfSet-curatedBy': 'Is the Subject of Collections Curated By',
  'subjectOfSet-language': 'Is the Subject of Collections In',
  'subjectOfSet-publishedAt': 'Is the Subject of Collections Published At',
  'subjectOfSet-publishedBy': 'Is the Subject of Collections Published By',
  'subjectOfSet-usedForEvent': 'Is the Subject of Collections Used For',
  'subjectOfWork-aboutAgent': 'Is the Subject of Works About',
  'subjectOfWork-aboutConcept': 'Is the Subject of Works About',
  'subjectOfWork-aboutEvent': 'Is the Subject of Works About',
  'subjectOfWork-aboutPlace': 'Is the Subject of Works About',
  'subjectOfWork-classification': 'Is the Subject of Works Categorized As',
  'subjectOfWork-createdAt': 'Is the Subject of Works Created At',
  'subjectOfWork-createdBy': 'Is the Subject of Works Created By',
  'subjectOfWork-creationCausedBy': 'Is the Subject of Works Caused By',
  'subjectOfWork-creationInfluencedBy': 'Is the Subject of Works Influenced By',
  'subjectOfWork-language': 'Is the Subject of Works In',
  'subjectOfWork-publishedAt': 'Is the Subject of Works Published At',
  'subjectOfWork-publishedBy': 'Is the Subject of Works Published By',
  'usedToProduce-classification': 'Is the Technique of Objects Categorized As',
  'usedToProduce-encounteredAt': 'Is the Technique of Objects Encountered At',
  'usedToProduce-encounteredBy': 'Is the Technique of Objects Encountered By',
  'usedToProduce-material': 'Is the Technique of Objects Made Of',
  'usedToProduce-producedAt': 'Is the Technique of Objects Created At',
  'usedToProduce-producedBy': 'Is the Technique of Objects Created By',
  'usedToProduce-producedUsing': 'Is the Technique of Objects Created Using',
  'usedToProduce-productionInfluencedBy':
    'Is the Technique of Objects Influenced By',
};

function getRelationName(relationKey) {
  if (RELATION_NAMES[relationKey]) {
    return RELATION_NAMES[relationKey];
  }
  const idx = relationKey.indexOf('-');
  const firstTerm = idx > -1 ? relationKey.substring(0, idx) : relationKey;
  xdmp.trace(
    traceName,
    `Couldn't find relation name for '${relationKey}', generating relation name: ${firstTerm}.`,
  );
  return utils.uppercaseFirstCharacter(utils.camelCaseToWords(firstTerm));
}

export { RELATION_NAMES, getRelationName };
