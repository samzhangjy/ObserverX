import PlatformConsole from '@observerx/console';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';
import pluginDefault from '@observerx/plugin-default';
import pluginUserInfo from '@observerx/plugin-user-info';

addEntities(...ObserverX.getDatabaseEntities());
const dataSource = getDataSource();

await dataSource.initialize();

const platform = new PlatformConsole(dataSource);

platform.start({
  model: 'GPT-3.5',
  parentId: 'CONSOLE',
  prompt: 'default',
  plugins: [pluginDefault, pluginUserInfo],
});
