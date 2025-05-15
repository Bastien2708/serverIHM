import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if ( !authHeader ) return next();

    const token = authHeader.split(' ')[1];
    if ( !token ) return next();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if ( userError || !user ) return next();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if ( profileError || !profile ) return next();

    req.user = {
      ...user,
      name: profile.name,
      role: profile.role,
    };

    return next();
  } catch ( error ) {
    console.error('Error in optionalAuth middleware:', error);
    return next();
  }
};
