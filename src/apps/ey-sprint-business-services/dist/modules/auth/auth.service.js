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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const user_schema_1 = require("../users/schemas/user.schema");
let AuthService = class AuthService {
    constructor(userModel, jwtService, config) {
        this.userModel = userModel;
        this.jwtService = jwtService;
        this.config = config;
        this.etihadDomain = config.get('app.etihadDomain', 'etihad.ae');
        this.adminEmail = config.get('app.adminBootstrapEmail', 'mithunpramilak@etihad.ae');
        this.adminPassword = config.get('app.adminBootstrapPassword', 'Admin@1234');
    }
    normalizeEmail(email) {
        return String(email ?? '').trim().toLowerCase();
    }
    usernameFromEmail(email) {
        return this.normalizeEmail(email).split('@')[0] || 'viewer';
    }
    assertEtihadEmail(email) {
        const normalized = this.normalizeEmail(email);
        if (!normalized.endsWith(`@${this.etihadDomain}`)) {
            throw new common_1.ForbiddenException(`Only @${this.etihadDomain} email addresses are allowed`);
        }
        return normalized;
    }
    buildToken(user) {
        const payload = {
            sub: String(user._id),
            email: user.email,
            role: user.role,
            assignedTeams: Array.isArray(user.assignedTeams)
                ? user.assignedTeams
                : [],
        };
        return this.jwtService.sign(payload);
    }
    userToSafe(user) {
        return {
            id: String(user._id),
            username: user.username,
            name: user.name,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            assignedTeams: Array.isArray(user.assignedTeams)
                ? user.assignedTeams
                : [],
            okta_id: user.okta_id ?? '',
        };
    }
    async ensureDefaultAdminUser() {
        const email = this.adminEmail;
        const username = this.usernameFromEmail(email);
        const existing = await this.userModel.findOne({ email });
        if (existing) {
            const needsUpdate = existing.role !== user_schema_1.USER_ROLES.ADMIN ||
                !existing.isActive ||
                existing.username !== username;
            if (needsUpdate) {
                existing.role = user_schema_1.USER_ROLES.ADMIN;
                existing.isActive = true;
                existing.username = username;
                existing.name = username;
                existing.firstName = '';
                existing.lastName = '';
                await existing.save();
            }
            return existing;
        }
        const passwordHash = await bcrypt.hash(this.adminPassword, 10);
        return this.userModel.create({
            username,
            name: username,
            firstName: '',
            lastName: '',
            email,
            password: passwordHash,
            role: user_schema_1.USER_ROLES.ADMIN,
            isActive: true,
            assignedTeams: [],
            okta_id: '',
        });
    }
    async signIn(dto) {
        const normalizedEmail = this.assertEtihadEmail(dto.email);
        const providedPassword = String(dto.password ?? '').trim();
        if (!providedPassword) {
            throw new common_1.BadRequestException('Password is required');
        }
        await this.ensureDefaultAdminUser();
        let user = await this.userModel.findOne({ email: normalizedEmail });
        if (!user) {
            const username = this.usernameFromEmail(normalizedEmail);
            const passwordHash = await bcrypt.hash(providedPassword, 10);
            user = await this.userModel.create({
                username,
                name: username,
                firstName: '',
                lastName: '',
                email: normalizedEmail,
                password: passwordHash,
                role: user_schema_1.USER_ROLES.VIEWER,
                isActive: true,
                assignedTeams: [],
                okta_id: '',
            });
        }
        else {
            const isValid = await bcrypt.compare(providedPassword, user.password);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            const expectedUsername = this.usernameFromEmail(normalizedEmail);
            if (user.username !== expectedUsername || user.name !== expectedUsername) {
                user.username = expectedUsername;
                user.name = expectedUsername;
                user.firstName = '';
                user.lastName = '';
                await user.save();
            }
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException('User account is disabled');
        }
        return {
            token: this.buildToken(user),
            user: this.userToSafe(user),
        };
    }
    async getUserById(id) {
        if (!id)
            return null;
        const user = await this.userModel.findById(id).lean();
        return user ? this.userToSafe(user) : null;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map