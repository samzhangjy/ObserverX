import 'reflect-metadata';

import * as http from 'http';
import express, { Application as ExApplication, Handler, RequestHandler } from 'express';
import cors from 'cors';
import * as https from 'https';
import { IRouter } from './utils/handlers.js';
import MetadataKeys from './utils/metadata.js';

export interface ApplicationStartParameters {
  port?: number;
  hostname?: string;
  privateKey?: string;
  certificate?: string;
  useHttps?: boolean;
}

/**
 * Server application impl.
 */
class Application {
  public readonly expressInstance: ExApplication;

  public nodeServerInstance: ReturnType<typeof this.expressInstance.listen>;

  get instance(): ExApplication {
    return this.expressInstance;
  }

  constructor(controllers: any[], middlewares?: RequestHandler[]) {
    this.expressInstance = express();
    this.expressInstance.use(cors({ origin: '*' }), express.json(), ...(middlewares ?? []));
    this.registerRouters(controllers);
  }

  private registerRouters(controllers: any[]) {
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

  public start({
    port = 3000,
    hostname = 'localhost',
    useHttps = false,
    privateKey,
    certificate,
  }: ApplicationStartParameters) {
    const server = useHttps
      ? https.createServer(
          {
            key: privateKey,
            cert: certificate,
          },
          this.expressInstance,
        )
      : http.createServer(this.expressInstance);
    this.nodeServerInstance = server.listen(port, hostname, () => {
      console.log(`Server is listening on ${hostname}:${port}`);
    });
  }

  public stop() {
    this.nodeServerInstance?.close();
    this.nodeServerInstance = null;
  }
}

export default Application;
