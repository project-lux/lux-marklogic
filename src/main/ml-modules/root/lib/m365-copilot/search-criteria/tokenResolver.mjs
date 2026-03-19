// TokenResolver.mjs
import * as utils from '../utils/utils.mjs';

// UNIT TEST CANDIDATE: arrays vs scalars, no-op on empty template
export function resolveTokens(ctsQueryStrWithTokens, tokenSpecs) {
  let template = ctsQueryStrWithTokens;
  tokenSpecs.forEach((token) => {
    const val = Array.isArray(token.value)
      ? utils.arrayToString(token.value, token.scalarType)
      : token.value;
    const regEx = new RegExp(token.pattern, 'g');
    if (utils.isNonEmptyString(template)) {
      template = template.replace(regEx, val);
    }
  });
  return template;
}
