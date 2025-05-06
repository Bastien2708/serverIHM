import { Role } from './role';

export type UpdateUserPayload = {
  password?: string;
  name?: string;
  role?: Role;
};
