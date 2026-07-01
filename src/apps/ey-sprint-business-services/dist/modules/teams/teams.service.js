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
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const team_schema_1 = require("./schemas/team.schema");
const DEFAULT_TEAMS = [
    { name: 'McLaren', key: 'MC', isActive: true },
    { name: 'Cadillac', key: 'CAD', isActive: true },
    { name: 'BMW', key: 'BMW', isActive: true },
    { name: 'Aston Martin', key: 'AS', isActive: true },
    { name: 'Haas', key: 'HAAS', isActive: true },
    { name: 'Mercedes', key: 'DMA', isActive: true },
    { name: 'Kick Sauber', key: 'SAUB', isActive: true },
    { name: 'Williams', key: 'WIL', isActive: true },
    { name: 'Audi', key: 'AUDI', isActive: true },
    { name: 'Ferrari', key: 'FER', isActive: true },
    { name: 'Renault', key: 'REN', isActive: true },
];
let TeamsService = class TeamsService {
    constructor(teamModel) {
        this.teamModel = teamModel;
    }
    async ensureDefaultTeams() {
        const count = await this.teamModel.countDocuments();
        if (!count) {
            await this.teamModel.insertMany(DEFAULT_TEAMS, { ordered: true });
        }
    }
    normalizeKey(value, required = true) {
        const key = String(value ?? '').trim().toUpperCase();
        if (required && !key) {
            throw new common_1.BadRequestException('Team key is required');
        }
        if (key && !/^[A-Z0-9]+$/.test(key)) {
            throw new common_1.BadRequestException('Team key must contain only letters and numbers');
        }
        return key;
    }
    async listTeams(filters = {}) {
        await this.ensureDefaultTeams();
        const query = {};
        if (filters.name) {
            query.name = { $regex: String(filters.name).trim(), $options: 'i' };
        }
        if (filters.key) {
            query.key = {
                $regex: String(filters.key).trim().toUpperCase(),
                $options: 'i',
            };
        }
        if (filters.status === 'active')
            query.isActive = true;
        if (filters.status === 'inactive')
            query.isActive = false;
        const teams = await this.teamModel.find(query).lean();
        return teams.sort((a, b) => a.name.localeCompare(b.name));
    }
    async getTeam(id) {
        await this.ensureDefaultTeams();
        const team = await this.teamModel.findById(id);
        if (!team) {
            throw new common_1.NotFoundException('Team not found');
        }
        return team;
    }
    async createTeam(dto) {
        await this.ensureDefaultTeams();
        const team = new this.teamModel({
            name: String(dto.name).trim(),
            key: this.normalizeKey(dto.key),
            isActive: dto.isActive !== false,
        });
        return team.save();
    }
    async updateTeam(id, dto) {
        await this.ensureDefaultTeams();
        const team = await this.teamModel.findById(id);
        if (!team) {
            throw new common_1.NotFoundException('Team not found');
        }
        if (dto.name !== undefined)
            team.name = String(dto.name).trim();
        if (dto.key !== undefined)
            team.key = this.normalizeKey(dto.key);
        if (dto.isActive !== undefined)
            team.isActive = Boolean(dto.isActive);
        return team.save();
    }
    async deleteTeam(id) {
        await this.ensureDefaultTeams();
        const result = await this.teamModel.findByIdAndDelete(id);
        if (!result) {
            throw new common_1.NotFoundException('Team not found');
        }
        return result;
    }
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(team_schema_1.Team.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], TeamsService);
//# sourceMappingURL=teams.service.js.map