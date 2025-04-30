import { NextFunction, Request, Response } from 'express';
import { sendError } from './httpResponses';

/**
 * Middleware to handle 404 errors for non-existing routes.
 * It sends a 404 error response with a message indicating the route was not found.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
export const routeNotFoundHandler = (req: Request, res: Response): void => {
  return sendError(res, 404, `The route you are looking for [${req.path}] does not exist...`);
};

/**
 * Middleware to handle global errors.
 * It sends a 500 error response with a message indicating an internal server error.
 *
 * @param {Error} error - The error object.
 * @param {Request} _req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} _next - The next middleware function.
 */
export const globalErrorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  return sendError(res, 500, error.message || 'Internal Server Error');
};
