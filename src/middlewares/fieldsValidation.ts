import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { sendError } from './httpResponses';

/**
 * Middleware to validate request body using Zod schema.
 *
 * @param {ZodTypeAny} schema - The Zod schema to validate against.
 */
export const validateFields = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if ( !result.success ) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid input';
      return sendError(res, 400, errorMessage);
    }
    next();
  };
};
