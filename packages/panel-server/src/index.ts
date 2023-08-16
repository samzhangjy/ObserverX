import { DataSource } from 'typeorm';
import { addEntities, getDataSource } from '@observerx/database';
import ObserverX from '@observerx/core';
import PlatformQQ from '@observerx/qq';
import { Application } from '@observerx/server-util';
import expressBasicAuth from 'express-basic-auth';
import platforms from './platforms.js';
import controllers from './controllers/index.js';

class PanelServer {
  private readonly dataSource: DataSource;

  private readonly server: Application;

  constructor() {
    addEntities(...ObserverX.getDatabaseEntities(), ...PlatformQQ.getDatabaseEntities());
    this.dataSource = getDataSource();
    this.dataSource.initialize().then((dataSource) => {
      platforms.set('qq', new PlatformQQ(dataSource));
      for (const platform of platforms) {
        platform[1].start();
      }
    });

    this.server = new Application(controllers, [
      expressBasicAuth({
        users: {
          [process.env.PANEL_ADMIN_USERNAME ?? 'admin']:
            process.env.PANEL_ADMIN_PASSWORD ?? 'admin',
        },
        unauthorizedResponse: () => ({
          status: 'error',
          message: 'Unauthorized.',
        }),
      }),
    ]);
  }

  public start() {
    this.server.start({
      port: parseInt(process.env.PANEL_PORT ?? '3000', 10),
      hostname: process.env.PANEL_HOST ?? 'localhost',
      useHttps: !!process.env.USE_HTTPS,
      privateKey: process.env.PANEL_HTTPS_PRIVATE_KEY ?? undefined,
      certificate: process.env.PANEL_HTTPS_CERTIFICATE ?? undefined,
    });
  }

  public stop() {
    this.server.stop();
  }
}

export default PanelServer;
