"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionWriteGuard = exports.USER_ROLES = void 0;
const common_1 = require("@nestjs/common");
exports.USER_ROLES = {
    ADMIN: 'Admin',
    EDITOR: 'Editor',
    VIEWER: 'Viewer',
};
let SubmissionWriteGuard = class SubmissionWriteGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            throw new common_1.UnauthorizedException('Authentication required');
        if (user.role === exports.USER_ROLES.ADMIN)
            return true;
        if (user.role === exports.USER_ROLES.EDITOR) {
            const teamKey = String(request.body?.ProjectKey ?? '').trim().toUpperCase();
            if (!teamKey) {
                throw new common_1.BadRequestException('ProjectKey is required');
            }
            const assigned = Array.isArray(user.assignedTeams)
                ? user.assignedTeams
                : [];
            if (!assigned.includes(teamKey)) {
                throw new common_1.ForbiddenException('Editor access denied for this team');
            }
            return true;
        }
        throw new common_1.ForbiddenException('Viewer role cannot submit updates');
    }
};
exports.SubmissionWriteGuard = SubmissionWriteGuard;
exports.SubmissionWriteGuard = SubmissionWriteGuard = __decorate([
    (0, common_1.Injectable)()
], SubmissionWriteGuard);
//# sourceMappingURL=submission-write.guard.js.map