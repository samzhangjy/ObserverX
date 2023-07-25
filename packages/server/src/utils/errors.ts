import { type Request, type Response, type NextFunction } from 'express';

type RouteHandler = (req: Request, res: Response, next: NextFunction) => any | Promise<any>;

const ErrorHandler = (): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    const originalFunc = descriptor.value;
    // eslint-disable-next-line no-param-reassign
    descriptor.value = (async (req, res, next) => {
      try {
        return (originalFunc as RouteHandler).apply(this, [req, res, next]);
      } catch (e) {
        return res.json({ status: 'error', message: e.toString() });
      }
    }) as any;
  };
};

export default ErrorHandler;
