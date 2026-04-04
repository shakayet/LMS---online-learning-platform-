import type { Request, Response, NextFunction, RequestHandler } from 'express';

type Controller = Record<string, any>;

export const labelController = <T extends Controller>(
  controller: T,
  controllerName: string,
  serviceMap?: Record<string, string>
): T => {
  const wrapped: Record<string, any> = {};

  for (const [key, value] of Object.entries(controller)) {
    if (typeof value === 'function') {
      const original: RequestHandler = value as RequestHandler;

      const labeled: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
        try {

          (res.locals as any).controllerLabel = `${controllerName}.${key}`;

          const svc = serviceMap?.[key];
          if (svc) (res.locals as any).serviceLabel = svc;
        } catch {

        }
        return original(req, res, next);
      };

      wrapped[key] = labeled;
    } else {
      wrapped[key] = value;
    }
  }

  return wrapped as T;
};