/*
 * Please keep most of JSON-LD knowledge within model.mjs.  We may be able to limit this module's JSON-LD
 * knowledge to the top-level property names.
 *
 * Use model.merge() to ensure top-level properties are merged versus overwritten.  Our first need for this
 * was subsequently invalidated: we were allowed to return the entire produced_by property, versus two or so
 * of its five properties.
 *
 * All profile functions are to return an Object but are *not* to convert from Node prematurely; see
 * model.mjs' module note.
 */
'use strict';

import * as model from './model.mjs';
import { TRACE_NAME_PROFILES as traceName } from './appConstants.mjs';

/**
 * Pair down a document by the specified profile.  Profiles are predefined and are to serve up a subset of the
 * document, which serves to cut down on the amount of data being returned.
 *
 * @param {Node} doc - The document to apply a profile to.
 * @param {String} profileName - The name of the profile to apply.
 * @param {String} lang - Desired language.  English applies when the item is not in the requested language.
 * @returns {Object} - The profiled document, or the entire JSON-LD when an unknown profile is requested.
 */
function applyProfile(doc, profileName, lang) {
  const start = new Date();
  let profiledDoc = null;
  let profiled = true;
  try {
    switch (profileName) {
      case 'location':
        profiledDoc = _applyLocation(doc, lang);
        break;
      case 'name':
        profiledDoc = _applyName(doc, lang);
        break;
      case 'relationship':
        profiledDoc = _applyRelationship(doc, lang);
        break;
      case 'results':
        profiledDoc = _applyResults(doc, lang);
        break;
      case 'rights':
        profiledDoc = _applyRights(doc, lang);
        break;
      default:
        profiledDoc = doc.toObject().json;
        profiled = false;
        if (profileName !== null) {
          console.warn(
            `An unknown profile was requested: '${profileName}'; entire document returned.`
          );
        }
    }
    if (profiled) {
      // Log mining script matches on portions of this message.
      xdmp.trace(
        traceName,
        `Applied the '${profileName}' profile to '${xdmp.nodeUri(doc)}' in ${
          new Date().getTime() - start.getTime()
        } milliseconds.`
      );
    } else {
      // Log mining script matches on portions of this message.
      xdmp.trace(
        traceName,
        `Returned '${xdmp.nodeUri(doc)}' without applying a profile in ${
          new Date().getTime() - start.getTime()
        } milliseconds.`
      );
    }
  } catch (e) {
    console.warn(
      `Unable to apply the '${profileName}' profile. Returning entire document. Cause: ${e.message}`
    );
    profiledDoc = doc.toObject().json;
  }
  return profiledDoc;
}

function _applyLocation(doc, lang) {
  return {
    id: model.getId(doc),
    type: model.getType(doc),
    identified_by: model.getIdentifiedByIdentifier(doc),
    member_of: model.getMemberOf(doc),
  };
}

function _applyName(doc, lang) {
  const profiledDoc = {
    id: model.getId(doc),
    type: model.getType(doc),
    identified_by: model.getIdentifiedByPrimaryName(doc, lang),
  };
  if (profiledDoc.type === model.TYPE_PLACE) {
    profiledDoc.defined_by = model.getDefinedBy(doc);
  }
  return profiledDoc;
}

function _applyRelationship(doc, lang) {
  const nameProfile = _applyName(doc, lang);
  if (
    [
      model.TYPE_HUMAN_MADE_OBJECT,
      model.TYPE_DIGITAL_OBJECT,
      model.TYPE_LINGUISTIC_OBJECT,
    ].includes(nameProfile.type)
  ) {
    return model.merge(nameProfile, {
      produced_by: model.getProducedBy(doc),
      classified_as: model.getSupertypes(doc),
      representation: model.getRepresentationImage(doc),
    });
  }
  return model.merge(nameProfile, {
    classified_as: model.getClassifiedAs(doc),
    representation: model.getRepresentationImage(doc),
  });
}

function _applyResults(doc, lang) {
  // Until requirements are updated for the results profile, return the entire document.
  return doc.toObject().json;

  /*
  const nameProfile = _applyName(doc, lang);
  if (model.getUiType(doc) === model.UI_TYPE_CONCEPT) {
    return model.merge(nameProfile, {
      referred_to_by: model.getReferredToBy(doc),
    });
  } else if (nameProfile.type === model.TYPE_PERSON) {
    return model.merge(nameProfile, {
      born: model.getBorn(doc),
      died: model.getDied(doc),
      representation: model.getRepresentation(doc),
      ...model.merge(
        { classified_as: model.getClassifiedAsNationalities(doc) },
        { classified_as: model.getClassifiedAsOccupations(doc) }
      ),
    });
  } else if (nameProfile.type === model.TYPE_PLACE) {
    return model.merge(nameProfile, {
      classified_as: model.getClassifiedAs(doc),
      defined_by: model.getDefinedBy(doc),
      part_of: model.getPartOf(doc),
    });
  } else if (
    [
      model.TYPE_HUMAN_MADE_OBJECT,
      model.TYPE_DIGITAL_OBJECT,
      model.TYPE_LINGUISTIC_OBJECT,
      model.TYPE_SET,
    ].includes(nameProfile.type)
  ) {
    return _applyResultsForObject(doc, lang, nameProfile);
  }

  // Since we have to execute code to determine if this doc is an exhibition,
  // we can save exhibitions for last.
  const classifiedAsExhibition = model.getClassifiedAsExhibition(doc);
  if (
    nameProfile.type === model.TYPE_ACTIVITY &&
    classifiedAsExhibition != null
  ) {
    return model.merge(nameProfile, {
      classified_as: classifiedAsExhibition,
      timespan: model.getTimespan(doc),
      took_place_at: model.getTookPlaceAt(doc),
      carried_out_by: model.getCarriedOutBy(doc),
    });
  }

  // The default
  return model.merge(_applyRelationship(doc, lang), {
    made_of: model.getMadeOf(doc),
    member_of: model.getMemberOf(doc),
  });
  */
}

function _applyResultsForObject(doc, lang, nameProfile) {
  // Combine nameProfile with properties all objects are to receive.
  let profileDoc = model.merge(nameProfile, {
    classified_as: model.getClassifiedAs(doc),
    member_of: model.getMemberOf(doc),
  });

  // Add additional properties that are type-specific.
  if (profileDoc.type === model.TYPE_HUMAN_MADE_OBJECT) {
    profileDoc = model.merge(profileDoc, {
      made_of: model.getMadeOf(doc),
      ...model.merge(
        { produced_by: model.getProducedByCarriedOutBy(doc) },
        { produced_by: model.getProducedByTimespan(doc) }
      ),
    });
  } else {
    profileDoc = model.merge(
      profileDoc,
      model.merge(
        { created_by: model.getCreatedByCarriedOutBy(doc) },
        { created_by: model.getCreatedByTimespan(doc) }
      )
    );
  }

  return profileDoc;
}

function _applyRights(doc, lang) {
  return {
    id: model.getId(doc),
    type: model.getType(doc),
    subject_to: model.getSubjectTo(doc, lang),
  };
}

export { applyProfile };
