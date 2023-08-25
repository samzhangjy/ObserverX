import PlatformConsole from '@observerx/console';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';
import PluginDefault from '@observerx/plugin-default';
import PluginUserInfo from '@observerx/plugin-user-info';

addEntities(...ObserverX.getDatabaseEntities(), ...PluginUserInfo.getDatabaseEntities());
const dataSource = getDataSource();

await dataSource.initialize();

const platform = new PlatformConsole(dataSource, {
  plugins: [PluginDefault, PluginUserInfo],
});

platform.start({
  model: 'GPT-3.5',
  parentId: 'CONSOLE',
  prompt: 'default',
});
