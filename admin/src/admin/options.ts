import { AdminJSOptions } from 'adminjs';
import { EntityList } from '@kolya-quizlet/entity';

import componentLoader from './component-loader.js';

const options: AdminJSOptions = {
  componentLoader,
  rootPath: '/admin',
  resources: EntityList,
  databases: [],
};

export default options;
