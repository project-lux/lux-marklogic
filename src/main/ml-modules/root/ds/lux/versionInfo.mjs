import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getVersionInfo } from '../../lib/environmentLib.mjs';

handleRequest(getVersionInfo);
