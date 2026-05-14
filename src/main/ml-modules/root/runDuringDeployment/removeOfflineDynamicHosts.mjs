import { removeDynamicHosts } from '../lib/scalingLib.mjs';
import { User } from '../lib/User.mjs';

const msg = removeDynamicHosts(new User(), true);

msg;
export default msg;
