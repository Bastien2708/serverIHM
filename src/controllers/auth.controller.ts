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
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, });
    if ( error ) return sendError(res, 400, error.message);
    return sendSuccess(res, 200, 'User registered successfully', {
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: {
        access_token: data.session?.access_token,
      }
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
    return sendSuccess(res, 200, 'Login successful', {
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: {
        access_token: data.session?.access_token,
      }
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to login user: ${error}`);
  }
};
