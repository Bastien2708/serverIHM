import 'express';
import type { User } from '@supabase/supabase-js';

declare module 'express' {
  interface Request {
    user?: User;
  }
}
