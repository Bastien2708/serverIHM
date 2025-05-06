import 'express';
import { AuthenticatedUser } from '../role';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
