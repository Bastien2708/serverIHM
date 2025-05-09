import { Application, Request, Response } from 'express';
import { routeNotFoundHandler, globalErrorHandler } from '../middlewares/routesErrorHandler';
import { sendSuccess } from '../middlewares/httpResponses';
import { formatDate } from '../utils/date';
import authRoutes from '../routes/auth.routes';
import usersRoutes from '../routes/users.routes';
import recipesRoutes from '../routes/recipes.routes';

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
  app.use('/api/users', usersRoutes);
  app.use('/api/recipes', recipesRoutes);
  // ...

  // Errors handling middlewares
  app.use(routeNotFoundHandler);
  app.use(globalErrorHandler);

};
