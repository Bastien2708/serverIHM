import {Request, Response} from 'express';
import {supabase} from '../config/supabase';
import {sendError, sendSuccess} from '../middlewares/httpResponses';

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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error || !data.user) {
            return sendError(res, 400, error?.message || 'Erreur à l’inscription');
        }

        const user = data.user;

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                name
            });

        if (profileError) {
            return sendError(res, 500, `Erreur lors de la création du profil : ${profileError.message}`);
        }

        return sendSuccess(res, 200, 'User registered successfully', {
            user: {
                id: user.id,
                email: user.email,
            },
            session: {
                access_token: data.session?.access_token,
            }
        });
    } catch (error) {
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
    const {email, password} = req.body;
    try {
        const {data, error} = await supabase.auth.signInWithPassword({email, password,});
        if (error) return sendError(res, 401, error.message);
        return sendSuccess(res, 200, 'Login successful', {
            user: {
                id: data.user?.id,
                email: data.user?.email,
            },
            session: {
                access_token: data.session?.access_token,
            }
        });
    } catch (error) {
        return sendError(res, 500, `Failed to login user: ${error}`);
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return sendError(res, 401, 'Missing authorization header');

        const token = authHeader.split(' ')[1];
        if (!token) return sendError(res, 401, 'Missing token');

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return sendError(res, 401, 'Invalid token or user not found');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) return sendError(res, 500, 'Erreur récupération profil');

        const { data: favorites, error: favError } = await supabase
            .from('favorites')
            .select('added_at, recipes(*)')
            .eq('user_id', user.id);

        if (favError) return sendError(res, 500, 'Erreur récupération favoris');

        return sendSuccess(res, 200, 'User retrieved successfully', {
            user: {
                id: user.id,
                email: user.email,
                name: profile.name,
                created_at: profile.created_at,
            },
            favorites: favorites?.map(fav => ({
                ...fav.recipes,
                added_at: fav.added_at
            })) || []
        });
    } catch (error) {
        return sendError(res, 500, `Failed to retrieve user: ${error}`);
    }
};