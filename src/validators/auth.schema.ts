import { z } from 'zod';

export const authSchema = z.object({
  email: z.string({ required_error: 'Email is required.' })
    .nonempty('Email cannot be empty.')
    .email('Bad email format.'),
  password: z.string({ required_error: 'Password is required.' })
    .nonempty('Password cannot be empty.')
    .min(8, 'Password must be at least 8 characters long.')
    .max(32, 'Password must be at most 32 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one digit.')
    .regex(/[\W_]/, 'Password must contain at least one special character.'),
});
