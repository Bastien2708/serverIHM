import { NextFunction, Request, Response } from 'express';
import { sendError } from './httpResponses';
import { supabase } from '../config/supabase';

export const checkToken = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if the request has an authorization header
      const authHeader = req.headers.authorization;
      if ( !authHeader )
        return sendError(res, 401, 'Missing authorization header');

      // Split the header to get the token
      const token = authHeader.split(' ')[1];
      if ( !token )
        return sendError(res, 401, 'Missing token');

      // Get the user from Supabase using the token
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if ( error || !user )
        return sendError(res, 401, 'Invalid token or user not found');

      // If everything is fine, call the next middleware and attach the user to the request
      req.user = user;
      next();
    } catch ( error ) {
      return sendError(res, 500, `Error checking user token : ${error}`);
    }
  };
};
