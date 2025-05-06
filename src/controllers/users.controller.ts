import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../middlewares/httpResponses';
import { supabase, supabaseAdmin } from '../config/supabase';
import { rolePriority } from '../types/role';
import { UpdateUserPayload } from '../types/users';

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

export const updateUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');

  const { name, password, role } = req.body as UpdateUserPayload;
  const requester = req.user;

  if ( !requester ) return sendError(res, 401, 'Unauthorized');

  const isSelf = requester.id === id;

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single();

  if ( targetProfileError || !targetProfile ) return sendError(res, 404, 'Target profile not found');

  const targetRole = targetProfile.role;
  const targetPriority = rolePriority[targetRole];
  const requesterPriority = rolePriority[requester.role];

  // Interdire les modifications d’utilisateurs de même ou plus haut niveau (sauf sur soi-même)
  if ( !isSelf && requesterPriority <= targetPriority ) {
    return sendError(res, 403, 'You can only update users with a lower role than yours');
  }

  // Interdire l’assignation de rôle de niveau égal ou supérieur
  if ( role && requesterPriority <= rolePriority[role] ) {
    return sendError(res, 403, 'You cannot assign a role equal to or higher than yours');
  }

  try {
    if ( password ) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
      if ( authUpdateError ) return sendError(res, 500, `Failed to update auth fields: ${authUpdateError.message}`);
    }

    const profileUpdates: Partial<UpdateUserPayload> = {};
    if ( name ) profileUpdates.name = name;
    if ( role ) profileUpdates.role = role;

    if ( Object.keys(profileUpdates).length > 0 ) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);

      if ( profileError ) {
        return sendError(res, 500, `Failed to update profile: ${profileError.message}`);
      }
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
    if ( userError || !userData.user ) return sendError(res, 404, 'User not found');

    const { data: profileData, error: profileError2 } = await supabase
      .from('profiles')
      .select('name, role, created_at')
      .eq('id', id)
      .single();

    if ( profileError2 || !profileData ) {
      return sendError(res, 500, `Failed to retrieve updated profile: ${profileError2.message}`);
    }

    return sendSuccess(res, 200, 'User updated successfully', {
      id: userData.user.id,
      email: userData.user.email,
      name: profileData.name,
      role: profileData.role,
      created_at: profileData.created_at,
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to update user: ${error}`);
  }
};

export const deleteUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const requester = req.user;

  if ( !requester ) return sendError(res, 401, 'Unauthorized');

  const requesterPriority = rolePriority[requester.role];

  // Récupérer le rôle de la cible
  const { data: targetProfile, error } = await supabase
    .from('profiles')
    .select('role, name, created_at')
    .eq('id', id)
    .single();

  if ( error || !targetProfile ) return sendError(res, 404, 'Target profile not found');

  const targetRole = targetProfile.role;
  const targetPriority = rolePriority[targetRole];

  if ( targetPriority >= requesterPriority ) return sendError(res, 403, 'You can only delete users with a lower role than yours');

  try {
    const { data: userBeforeDelete, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
    if ( userError || !userBeforeDelete.user ) return sendError(res, 404, 'User not found');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if ( authError ) return sendError(res, 500, `Failed to delete auth user: ${authError.message}`);

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if ( profileError ) return sendError(res, 500, `Failed to delete profile: ${profileError.message}`);

    return sendSuccess(res, 200, 'User deleted successfully', {
      id: userBeforeDelete.user.id,
      email: userBeforeDelete.user.email,
      name: targetProfile.name,
      role: targetProfile.role,
      created_at: targetProfile.created_at,
    });
  } catch ( error ) {
    return sendError(res, 500, `Failed to delete user: ${error}`);
  }
};
