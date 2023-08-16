import 'reflect-metadata';
import { Platform } from '@observerx/core';
import { DataSource } from 'typeorm';
import { Application } from '@observerx/server-util';
import { Entity } from '@observerx/database';
import controllers from './controllers/index.js';

class PlatformHttpServer extends Platform {
  public readonly platformActions: string[] = [];

  private application: Application;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.initialize();
  }

  public initialize() {
    this.application = new Application(controllers);
  }

  public static getDatabaseEntities(): Entity[] {
    return [];
  }

  public invokePlatformAction(): any {
    return null;
  }

  public start() {
    this.application.start({
      port: parseInt(process.env.SERVER_PORT ?? '3000', 10),
      hostname: process.env.SERVER_HOST ?? 'localhost',
      useHttps: !!process.env.USE_HTTPS,
      privateKey: process.env.SERVER_HTTPS_PRIVATE_KEY ?? undefined,
      certificate: process.env.SERVER_HTTPS_CERTIFICATE ?? undefined,
    });
  }

  public stop() {
    this.application.stop();
  }
}

export default PlatformHttpServer;
