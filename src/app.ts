import express, { Application } from 'express';
import { setupLogger } from './config/logger';
import { setupMiddlewares } from './config/middlewares';
import { setupSwagger } from './config/swagger';
import { setupRoutes } from './config/routes';
import { isDev } from './utils/env';

const app: Application = express();

setupLogger(app);
setupMiddlewares(app);

// Only setup Swagger in development mode
if ( isDev() ) setupSwagger(app);

setupRoutes(app);

export default app;
