import { z } from 'zod';
import { Roles } from '../types/role';

const passwordSchema = z.string()
  .nonempty('Password cannot be empty.')
  .min(8, 'Password must be at least 8 characters long.')
  .max(32, 'Password must be at most 32 characters long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one digit.')
  .regex(/[\W_]/, 'Password must contain at least one special character.')
  .optional();

const nameSchema = z.string().optional();

const roleSchema = z.enum([Roles.ADMIN, Roles.USER]).optional();

export const updateUserSchema = z.object({
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema
}).refine(data => {
  return Object.values(data).some(value => value !== undefined);
}, {
  message: 'At least one field must be provided for update.',
});
