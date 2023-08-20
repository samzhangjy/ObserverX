import { MiddlewareClassType } from '../middlewares/index.js';
import { Action } from '../actions/index.js';

interface Plugin {
  middlewares: MiddlewareClassType[];
  actions: Action[];
}

export default Plugin;
