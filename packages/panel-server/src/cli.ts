#!/usr/bin/env node
import { Command } from 'commander';
import PanelServer from './index.js';

const program = new Command();

program
  .name('observerx-panel')
  .description('CLI to manage ObserverX admin panel server.')
  .version('0.8.0');

program
  .command('start')
  .description('Start ObserverX admin panel server.')
  .action(() => {
    const panel = new PanelServer();
    panel.start();
  });

program.parse();
