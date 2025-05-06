import { Request, Response, NextFunction } from 'express';
import { sendError } from './httpResponses';
import { supabase } from '../config/supabase';
import { rolePriority } from '../types/role';

export const checkMinRole = (minRole: keyof typeof rolePriority) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if ( !authHeader ) return sendError(res, 401, 'Missing authorization header');

      const token = authHeader.split(' ')[1];
      if ( !token ) return sendError(res, 401, 'Missing token');

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if ( userError || !user ) return sendError(res, 401, 'Invalid token or user not found');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if ( profileError || !profile ) return sendError(res, 403, 'Profile not found or error loading role');

      const userRole = profile.role;
      const userLevel = rolePriority[userRole];
      const requiredLevel = rolePriority[minRole];

      if ( userLevel < requiredLevel ) return sendError(res, 403, 'Access denied: you do not have the required role');

      req.user = {
        ...user,
        name: profile.name,
        role: profile.role,
      };
      next();
    } catch ( error ) {
      return sendError(res, 500, `Error checking user role: ${error}`);
    }
  };
};
