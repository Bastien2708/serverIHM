import type { User as SupabaseUser } from '@supabase/supabase-js';

export const Roles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type Role = keyof typeof Roles;

export const rolePriority: Record<string, number> = {
  user: 1,
  admin: 2,
};

export interface AuthenticatedUser extends SupabaseUser {
  name: string;
  role: 'user' | 'admin';
}
