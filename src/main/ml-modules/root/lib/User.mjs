import { isDefined, isUndefined } from '../utils/utils.mjs';
import { InternalServerError } from './mlErrorsLib.mjs';
import { COLLECTION_NAME_USER_PROFILE } from './appConstants.mjs';

const User = class {
  constructor() {
    this.username = xdmp.getCurrentUser();

    this.userIri = null;

    // TBD if a good idea to cache the role names.
    this.roleNames = xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      });
  }

  getUsername() {
    return this.username;
  }

  // Electing to use "user IRI" instead of "user ID" to avoid confusion with the user ID in the
  // security database. User IRI should match the document's URI and /json/id.
  getUserIri() {
    // In case we're operating in the same request that created the user profile (yet later
    // transaction), be willing to check the URI lexicon again.
    if (isUndefined(this.userIri)) {
      this.userIri = User.determineUserIri(this.getUsername());
    }
    return this.userIri;
  }

  hasUserProfile() {
    return isDefined(this.getUserIri());
  }

  hasRole(roleName) {
    return this.roleNames.includes(roleName);
  }

  // Given document permissions, neither a service account nor a user should be able to access another user's profile.
  static determineUserIri(username) {
    const results = cts
      .uris(
        '',
        ['limit=2', 'score-zero'],
        cts.collectionQuery(COLLECTION_NAME_USER_PROFILE)
      )
      .toArray();
    if (results.length > 1) {
      throw new InternalServerError(
        `Multiple user profiles found for username '${username}'.`
      );
    } else if (results.length === 1) {
      return results[0] + '';
    } else {
      return null;
    }
  }
};

export { User };
