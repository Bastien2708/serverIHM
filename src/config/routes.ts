import { Application, Request, Response } from 'express';
import authRoutes from '../routes/auth.routes';
import { routeNotFoundHandler, globalErrorHandler } from '../middlewares/routesErrorHandler';
import { sendSuccess } from '../middlewares/httpResponses';
import { formatDate } from '../utils/date';

export const setupRoutes = (app: Application) => {

// Health check route
  app.get('/', async (_: Request, res: Response) => {
    sendSuccess(res, 200, '🚀 Express server is online!', {
      uptime: `${process.uptime().toFixed(0)} seconds`,
      timestamp: formatDate(),
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  // ...

  // Errors handling middlewares
  app.use(routeNotFoundHandler);
  app.use(globalErrorHandler);

};
