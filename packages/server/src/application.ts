import 'reflect-metadata';

import * as http from 'http';
import express, { Application as ExApplication, Handler } from 'express';
import controllers from './controllers/index.js';
import { IRouter } from './utils/handlers.js';
import MetadataKeys from './utils/metadata.js';

/**
 * ObserverX server application.
 */
class ObserverXServer {
  private readonly expressInstance: ExApplication;

  get instance(): ExApplication {
    return this.expressInstance;
  }

  constructor() {
    this.expressInstance = express();
    this.expressInstance.use(express.json());
    this.registerRouters();
  }

  private registerRouters() {
    controllers.forEach((ControllerClass) => {
      const controllerInstance: { [handleName: string]: Handler } = new ControllerClass() as any;

      const basePath: string = Reflect.getMetadata(MetadataKeys.BASE_PATH, ControllerClass);
      const routers: IRouter[] = Reflect.getMetadata(MetadataKeys.ROUTERS, ControllerClass);

      const exRouter = express.Router();

      routers.forEach(({ method, path, handlerName }) => {
        exRouter[method](path, controllerInstance[String(handlerName)].bind(controllerInstance));
      });

      this.expressInstance.use(basePath, exRouter);
    });
  }

  public start(port: number = 3000, hostname: string = 'localhost') {
    const server = http.createServer(this.expressInstance);
    server.listen(port, hostname, () => {
      console.log(`Server is listening on ${hostname}:${port}`);
    });
  }
}

export default ObserverXServer;
