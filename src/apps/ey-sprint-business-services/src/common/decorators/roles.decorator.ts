import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Restrict a route to one or more user roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

