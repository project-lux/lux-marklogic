import { processSearchCriteria } from './searchLib.mjs';
import { isDefined, isUndefined } from '../utils/utils.mjs';
import { InternalServerError } from './mlErrorsLib.mjs';

const User = class {
  constructor() {
    this.userProfile = null;
  }

  getUsername() {
    return xdmp.getCurrentUser();
  }

  // Electing to use "user IRI" instead of "user ID" to avoid confusion with the user ID in the
  // security database. User IRI should match the document's URI and /json/id.
  getUserIri() {
    const userProfile = this.getUserProfile();
    return isDefined(userProfile) ? fn.baseUri(userProfile) + '' : null;
  }

  getUserProfile() {
    if (isUndefined(this.userProfile)) {
      const searchCriteriaProcessor = processSearchCriteria({
        searchCriteria: {
          username: this.getUsername(),
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
          `Multiple user profiles found for username '${this.getUsername()}'.`
        );
      } else if (results.length === 1) {
        this.userProfile = cts.doc(results[0].id);
      }
    }
    return this.userProfile;
  }

  hasRole(roleName) {
    return xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      })
      .includes(roleName);
  }
};

export { User };
