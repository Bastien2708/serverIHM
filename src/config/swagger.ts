import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

/**
 * Set up Swagger documentation for the API.
 * @param {Application} app - The Express application instance.
 */
export const setupSwagger = (app: Application) => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerJSDoc({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'SupeExpress API',
          version: process.env.APP_VERSION || '1.0.0',
          description: 'A clean and minimal Node.js + Express + TypeScript + Supabase starter template, ready to deploy on Vercel.',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      apis: ['./src/routes/*.ts'],
    }))
  );
};
