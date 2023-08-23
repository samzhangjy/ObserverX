#!/usr/bin/env node
import { Command } from 'commander';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';
import PluginUserInfo from '@observerx/plugin-user-info';
import PluginDefault from '@observerx/plugin-default';
import PlatformConsole from './index.js';

const program = new Command();

addEntities(...ObserverX.getDatabaseEntities(), ...PluginUserInfo.getDatabaseEntities());

const dataSource = getDataSource();
await dataSource.initialize();

program.name('observerx-console').description('ObserverX console platform CLI.').version('0.8.0');

program
  .command('start')
  .description('Start ObserverX console session.')
  .action(() => {
    const platform = new PlatformConsole(dataSource, {
      plugins: [PluginDefault, PluginUserInfo],
    });
    platform.start();
  });

program.parse();
