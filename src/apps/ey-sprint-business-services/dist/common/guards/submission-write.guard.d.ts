import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare const USER_ROLES: {
    readonly ADMIN: "Admin";
    readonly EDITOR: "Editor";
    readonly VIEWER: "Viewer";
};
export declare class SubmissionWriteGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
