import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { RecipeType } from '../types/recipes';
import { sendError } from './httpResponses';

export const signRecipe = (recipe: RecipeType): string => {
  // TODO: Move this secret to an environment variable
  const secret = 'IlFautAjouterUnSecretDansLeFichierEnv';
  const payload = JSON.stringify(recipe);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export const verifyRecipeToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-recipe-token'] as string;
  const recipe = req.body;
  if ( !token ) return sendError(res, 400, 'Missing token');
  const expectedToken = signRecipe(recipe);
  if ( token !== expectedToken ) return sendError(res, 401, 'Invalid token');
  next();
};
