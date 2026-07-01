import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

export const USER_ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
} as const;

/**
 * Guards the submission upsert endpoint.
 * - Admin: full access.
 * - Editor: only for teams in their assignedTeams list.
 * - Viewer: rejected.
 */
@Injectable()
export class SubmissionWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Authentication required');

    if (user.role === USER_ROLES.ADMIN) return true;

    if (user.role === USER_ROLES.EDITOR) {
      const teamKey = String(request.body?.ProjectKey ?? '').trim().toUpperCase();
      if (!teamKey) {
        throw new BadRequestException('ProjectKey is required');
      }
      const assigned: string[] = Array.isArray(user.assignedTeams)
        ? user.assignedTeams
        : [];
      if (!assigned.includes(teamKey)) {
        throw new ForbiddenException('Editor access denied for this team');
      }
      return true;
    }

    throw new ForbiddenException('Viewer role cannot submit updates');
  }
}

