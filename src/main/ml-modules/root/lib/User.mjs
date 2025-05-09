import { processSearchCriteria } from './searchLib.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';
import { InternalServerError } from './mlErrorsLib.mjs';

const User = class {
  constructor(eagerLoad = false) {
    // For the benefit of unit tests, capture at the time of instantiation.
    this.username = xdmp.getCurrentUser();
    this.roleNames = xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      });

    // Outside the unit test context, we can wait to retrieve the user profile until requested.
    this.userProfile = eagerLoad
      ? User.searchForUserProfile(this.username)
      : null;
  }

  getUsername() {
    return this.username;
  }

  // Electing to use "user IRI" instead of "user ID" to avoid confusion with the user ID in the
  // security database. User IRI should match the document's URI and /json/id.
  getUserIri() {
    const userProfile = this.getUserProfile();
    return isDefined(userProfile) ? fn.baseUri(userProfile) + '' : null;
  }

  getUserProfile() {
    if (isUndefined(this.userProfile)) {
      this.userProfile = User.searchForUserProfile(this.username);
    }
    return this.userProfile;
  }

  // Given document permissions, neither a service account nor a user should be able to access another user's profile.
  static searchForUserProfile(username) {
    const searchCriteriaProcessor = processSearchCriteria({
      searchCriteria: {
        username,
      },
      searchScope: 'agent',
      allowMultiScope: false,
      page: 1,
      pageLength: 2,
      filterResults: false,
    });
    const results = searchCriteriaProcessor.getSearchResults().results;
    if (results.length > 1) {
      throw new InternalServerError(
        `Multiple user profiles found for username '${username}'.`
      );
    } else if (results.length === 1) {
      return cts.doc(results[0].id);
    }
    return null;
  }

  hasRole(roleName) {
    return this.roleNames.includes(roleName);
  }
};

export { User };
