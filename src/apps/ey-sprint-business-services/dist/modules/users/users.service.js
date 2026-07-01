"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
const team_schema_1 = require("../teams/schemas/team.schema");
const auth_service_1 = require("../auth/auth.service");
let UsersService = class UsersService {
    constructor(userModel, teamModel, authService) {
        this.userModel = userModel;
        this.teamModel = teamModel;
        this.authService = authService;
    }
    toSafeUser(user) {
        return {
            id: String(user._id),
            username: user.username,
            name: user.name,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            email: user.email,
            role: user.role,
            isActive: user.isActive !== false,
            assignedTeams: Array.isArray(user.assignedTeams) ? user.assignedTeams : [],
            okta_id: user.okta_id ?? '',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    normalizeRole(value) {
        const role = String(value ?? '').trim();
        if (!Object.values(user_schema_1.USER_ROLES).includes(role)) {
            throw new common_1.BadRequestException(`role must be one of: ${Object.values(user_schema_1.USER_ROLES).join(', ')}`);
        }
        return role;
    }
    normalizeStatus(value) {
        const status = String(value ?? '').trim().toLowerCase();
        if (!status)
            return '';
        if (!['active', 'inactive'].includes(status)) {
            throw new common_1.BadRequestException("status must be 'active' or 'inactive'");
        }
        return status;
    }
    async normalizeAssignedTeams(assignedTeams, role) {
        if (role !== user_schema_1.USER_ROLES.EDITOR) {
            return [];
        }
        const requested = [
            ...new Set((Array.isArray(assignedTeams) ? assignedTeams : [])
                .map((team) => String(team ?? '').trim().toUpperCase())
                .filter(Boolean)),
        ];
        if (requested.length === 0) {
            return [];
        }
        const existingTeams = await this.teamModel
            .find({ key: { $in: requested } }, { key: 1 })
            .lean();
        const existingKeys = new Set(existingTeams.map((team) => team.key));
        const invalid = requested.filter((key) => !existingKeys.has(key));
        if (invalid.length) {
            throw new common_1.BadRequestException(`Unknown team key(s): ${invalid.join(', ')}`);
        }
        return requested;
    }
    async listUsers(filters = {}) {
        await this.authService.ensureDefaultAdminUser();
        const query = {};
        const search = String(filters.search ?? '').trim();
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
            ];
        }
        if (filters.role) {
            query.role = this.normalizeRole(filters.role);
        }
        const status = this.normalizeStatus(filters.status);
        if (status === 'active')
            query.isActive = true;
        if (status === 'inactive')
            query.isActive = false;
        const users = await this.userModel.find(query).sort({ email: 1 }).lean();
        return users.map((user) => this.toSafeUser(user));
    }
    async updateUser(id, dto) {
        await this.authService.ensureDefaultAdminUser();
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const nextRole = dto.role !== undefined ? this.normalizeRole(dto.role) : user.role;
        const nextIsActive = dto.isActive !== undefined ? Boolean(dto.isActive) : user.isActive !== false;
        const nextAssignedTeams = await this.normalizeAssignedTeams(dto.assignedTeams !== undefined ? dto.assignedTeams : user.assignedTeams, nextRole);
        user.role = nextRole;
        user.isActive = nextIsActive;
        user.assignedTeams = nextAssignedTeams;
        await user.save();
        return this.toSafeUser(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(team_schema_1.Team.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        auth_service_1.AuthService])
], UsersService);
//# sourceMappingURL=users.service.js.map