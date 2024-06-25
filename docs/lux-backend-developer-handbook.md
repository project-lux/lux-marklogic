## **LUX Backend Developer Handbook**

- [Coding Standards and Guidance](#coding-standards-and-guidance)
- [Code Formatting](#code-formatting)

# Coding Standards and Guidance

Consistent coding standards encouraged but must go by example if not otherwise pointed out below.

Allow the function and variables names speak for the code.  Comment rot is real.  Include module-level comments to help explain higher level patterns or aspects you would like honored.  Include inline comments to clarify aspects.

camelCase for directory, file, function, and variable names.  ML Gradle explains some of the exceptions; although, this is likely addressable via Gradle properties.

The names of private functions are to begin with an underscore.

Alphabetize:

* Functions in modules where it makes sense to do so, such as [/src/main/ml-modules/root/lib/model.mjs](/src/main/ml-modules/root/lib/model.mjs).  A couple *example* exceptions:
    * Place a module's only exported function at the top.
    * List in execution order.
* Hard-coded lists of values.
* Index names.
* List of module's exports.
* Module variables/constants, trumped by logical grouping.

Apply the [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself).

Apply the [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself).

Have fun :)

# Code Formatting

Please abide by [/.vscode/settings.json](/.vscode/settings.json).  Don't like an aspect?  Discuss with your tech lead.  Thus far, it's been consistency over individual preference.  That consistency also helps when comparing changes.
