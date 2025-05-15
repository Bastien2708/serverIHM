import type { User as SupabaseUser } from '@supabase/supabase-js';

export const Roles = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type Role = keyof typeof Roles;

export const rolePriority: Record<string, number> = {
  [Roles.USER]: 1,
  [Roles.ADMIN]: 2,
  [Roles.SUPER_ADMIN]: 3,
};

export interface AuthenticatedUser extends SupabaseUser {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
}
