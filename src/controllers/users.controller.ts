import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../middlewares/httpResponses';
import { supabase, supabaseAdmin } from '../config/supabase';

export const getUsers = async (_: Request, res: Response) => {
  try {
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if ( usersError || !usersData ) return sendError(res, 500, usersError?.message || 'Error fetching users');

    const users = usersData.users;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, role, created_at');

    if ( profilesError || !profiles ) return sendError(res, 500, profilesError?.message || 'Error fetching profiles');

    const merged = users.map(user => {
      const profile = profiles.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        name: profile?.name || 'not found',
        role: profile?.role || 'user',
        created_at: profile?.created_at || user.created_at,
      };
    });

    return sendSuccess(res, 200, 'Retrieved users successfully', merged);

  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve users: ${error}`);
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
    if ( userError || !userData?.user ) return sendError(res, 404, userError?.message || 'User not found');

    const user = userData.user;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role, created_at')
      .eq('id', id)
      .single();

    if ( profileError || !profile ) return sendError(res, 500, 'User found, but failed to load profile');

    return sendSuccess(res, 200, 'User fetched successfully', {
      id: user.id,
      email: user.email,
      name: profile.name,
      role: profile.role,
      created_at: profile.created_at,
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve user: ${error}`);
  }
};
