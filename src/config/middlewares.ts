import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sendError } from '../middlewares/httpResponses';

/**
 * Set up the basic middlewares for the application.
 * @param {Application} app - The Express application instance.
 */
export const setupMiddlewares = (app: Application) => {

  // Rate limiting middleware to limit the number of requests from a single IP
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    handler: (_, res) => {
      sendError(res, 429, 'Too many requests, please try again later.');
    }
  }));

  // JSON body parser middleware with a limit of 10mb
  app.use(express.json({ limit: '10mb' }));

  // Prevent the favicon.ico request from browsers
  app.get('/favicon.ico', (_, res) => {
    res.status(204).end();
  });

  // CORS middleware to allow cross-origin requests
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,POST,PATCH,DELETE,OPTIONS',
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  }));

  // Helmet middleware to secure Express apps by setting various HTTP headers
  app.use(helmet());

};
