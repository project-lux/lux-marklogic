const User = class {
  constructor() {
    // TBD if a good idea to cache the role names.
    this.roleNames = xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      });
  }

  getUsername() {
    return xdmp.getCurrentUser();
  }

  hasRole(roleName) {
    return this.roleNames.includes(roleName);
  }
};

export { User };
