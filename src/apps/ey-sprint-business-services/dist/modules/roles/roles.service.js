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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const sprint_role_schema_1 = require("./schemas/sprint-role.schema");
const DEFAULT_ROLES = [
    { name: 'Full Stack Dev', roleType: 'team', isCapacity: true },
    { name: 'Front End Dev', roleType: 'team', isCapacity: true },
    { name: 'Back End Dev', roleType: 'team', isCapacity: true },
    { name: 'Tester', roleType: 'team', isCapacity: true },
    { name: 'Architect', roleType: 'non-team', isCapacity: false },
    { name: 'Scrum Master', roleType: 'non-team', isCapacity: false },
    { name: 'Product Owner', roleType: 'non-team', isCapacity: false },
];
let RolesService = class RolesService {
    constructor(roleModel) {
        this.roleModel = roleModel;
    }
    normalizeRoleType(value) {
        const roleType = String(value ?? 'team').trim().toLowerCase();
        if (!['team', 'non-team'].includes(roleType)) {
            throw new common_1.BadRequestException("roleType must be 'team' or 'non-team'");
        }
        return roleType;
    }
    async ensureDefaultRoles() {
        const count = await this.roleModel.countDocuments();
        if (!count) {
            await this.roleModel.insertMany(DEFAULT_ROLES, { ordered: true });
        }
    }
    async listRoles(filters = {}) {
        await this.ensureDefaultRoles();
        const query = {};
        if (filters.name) {
            query.name = { $regex: String(filters.name).trim(), $options: 'i' };
        }
        if (filters.roleType) {
            query.roleType = this.normalizeRoleType(filters.roleType);
        }
        if (filters.capacityFilter === 'included')
            query.isCapacity = true;
        if (filters.capacityFilter === 'excluded')
            query.isCapacity = false;
        const roles = await this.roleModel.find(query).lean();
        return roles.sort((a, b) => {
            if (a.roleType !== b.roleType) {
                return a.roleType === 'team' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }
    async getRole(id) {
        await this.ensureDefaultRoles();
        const role = await this.roleModel.findById(id);
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        return role;
    }
    async createRole(dto) {
        await this.ensureDefaultRoles();
        const roleType = this.normalizeRoleType(dto.roleType ?? 'team');
        const isCapacity = roleType === 'team' ? true : Boolean(dto.isCapacity);
        const role = new this.roleModel({
            name: String(dto.name).trim(),
            roleType,
            isCapacity,
        });
        return role.save();
    }
    async updateRole(id, dto) {
        await this.ensureDefaultRoles();
        const role = await this.roleModel.findById(id);
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        const roleType = this.normalizeRoleType(dto.roleType ?? role.roleType);
        role.roleType = roleType;
        role.isCapacity =
            roleType === 'team'
                ? true
                : dto.isCapacity !== undefined
                    ? Boolean(dto.isCapacity)
                    : role.isCapacity;
        if (dto.name !== undefined) {
            const name = String(dto.name).trim();
            if (!name) {
                throw new common_1.BadRequestException('Role name is required');
            }
            role.name = name;
        }
        return role.save();
    }
    async deleteRole(id) {
        await this.ensureDefaultRoles();
        const role = await this.roleModel.findByIdAndDelete(id);
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        return role;
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(sprint_role_schema_1.SprintRole.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RolesService);
//# sourceMappingURL=roles.service.js.map