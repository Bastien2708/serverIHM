import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendError, sendSuccess } from '../middlewares/httpResponses';

/**
 * Controller to handle user registration.
 * It receives the email and password from the request body,
 * and attempts to register the user using Supabase.
 * If successful, it sends a success response with the user data.
 * If an error occurs, it sends an error response with the error message.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if ( signUpError ) return sendError(res, 400, signUpError.message);
    const user = signUpData.user;
    const session = signUpData.session;
    if ( !user ) return sendError(res, 400, 'User not found');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: user.id, name }])
      .select('name, created_at')
      .single();

    if ( profileError || !profileData ) {
      return sendError(res, 500, 'Error creating profile');
    }

    return sendSuccess(res, 200, 'User registered successfully', {
      user: {
        id: user.id,
        email: user.email,
        name: profileData.name,
        created_at: profileData.created_at,
      },
      session: session
        ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        }
        : null,
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to register user: ${error}`);
  }
};

/**
 * Controller to handle user login.
 * It receives the email and password from the request body,
 * and attempts to log in the user using Supabase.
 * If successful, it sends a success response with the user data.
 * If an error occurs, it sends an error response with the error message.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, });
    if ( error ) return sendError(res, 401, error.message);
    const user = data.user;
    const session = data.session;
    if ( !user || !session ) {
      return sendError(res, 401, 'Invalid login response');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', user.id)
      .single();

    if ( profileError || !profile ) {
      return sendError(res, 500, 'Failed to retrieve user profile');
    }
    return sendSuccess(res, 200, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        name: profile.name,
        created_at: profile.created_at,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to login user: ${error}`);
  }
};

/**
 * Controller to handle user information retrieval.
 * It retrieves the user information from the request object,
 * and sends a success response with the user data.
 * If an error occurs, it sends an error response with the error message.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const { user } = req;
    if ( !user ) return sendError(res, 401, 'User not found');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', user.id)
      .single();

    if ( profileError || !profile ) return sendError(res, 500, 'Failed to load user profile');

    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('added_at, recipes(*)')
      .eq('user_id', user.id);

    if ( favError ) return sendError(res, 500, 'Error retrieving favorites');

    const formattedFavorites = (favorites || []).map(fav => ({
      ...fav.recipes,
      added_at: fav.added_at,
    }));

    return sendSuccess(res, 200, 'User retrieved successfully', {
      user: {
        id: user.id,
        email: user.email,
        name: profile.name,
        created_at: profile.created_at,
      },
      favorites: formattedFavorites,
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve user: ${error}`);
  }
};

/**
 * Controller to handle token refresh.
 * It receives the refresh token from the request body,
 * and attempts to refresh the session using Supabase.
 * If successful, it sends a success response with the new session data.
 * If an error occurs, it sends an error response with the error message.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
export const refreshToken = async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if ( error || !data.session || !data.user ) {
      return sendError(res, 401, error?.message || 'Failed to refresh session');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', data.user.id)
      .single();

    if ( profileError || !profile ) {
      return sendError(res, 500, 'Session refreshed, but failed to load user profile');
    }

    return sendSuccess(res, 200, 'Token refreshed successfully', {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        created_at: profile.created_at,
      },
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to refresh token: ${error}`);
  }
};
