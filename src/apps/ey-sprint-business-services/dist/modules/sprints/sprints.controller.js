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
exports.SprintsController = void 0;
const common_1 = require("@nestjs/common");
const sprints_service_1 = require("./sprints.service");
const create_sprint_dto_1 = require("./dto/create-sprint.dto");
const update_sprint_dto_1 = require("./dto/update-sprint.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_schema_1 = require("../users/schemas/user.schema");
let SprintsController = class SprintsController {
    constructor(sprintsService) {
        this.sprintsService = sprintsService;
    }
    listSprints(query) {
        return this.sprintsService.listSprints(query);
    }
    previewNextPi(pi) {
        return this.sprintsService.previewNextPiBatch(pi);
    }
    listAddSprintOptions() {
        return this.sprintsService.listAddSprintOptions();
    }
    createNextPi(body) {
        return this.sprintsService.createNextPiBatch(body?.pi);
    }
    createNewSprintInExistingPi(body) {
        return this.sprintsService.createNewSprintInExistingPi(body.pi);
    }
    createSprint(dto) {
        return this.sprintsService.createSprint(dto);
    }
    getSprint(id) {
        return this.sprintsService.getSprint(id);
    }
    updateSprint(id, dto) {
        return this.sprintsService.updateSprint(id, dto);
    }
    deletePi(piNumber) {
        return this.sprintsService.deletePiBatch(piNumber);
    }
    deleteSprint(id) {
        return this.sprintsService.deleteSprint(id);
    }
};
exports.SprintsController = SprintsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "listSprints", null);
__decorate([
    (0, common_1.Get)('next-pi-preview'),
    __param(0, (0, common_1.Query)('pi')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "previewNextPi", null);
__decorate([
    (0, common_1.Get)('add-sprint-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "listAddSprintOptions", null);
__decorate([
    (0, common_1.Post)('create-next-pi'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "createNextPi", null);
__decorate([
    (0, common_1.Post)('create-new-sprint'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "createNewSprintInExistingPi", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sprint_dto_1.CreateSprintDto]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "createSprint", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "getSprint", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_sprint_dto_1.UpdateSprintDto]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "updateSprint", null);
__decorate([
    (0, common_1.Delete)('pi/:piNumber'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('piNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "deletePi", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintsController.prototype, "deleteSprint", null);
exports.SprintsController = SprintsController = __decorate([
    (0, common_1.Controller)('sprints'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sprints_service_1.SprintsService])
], SprintsController);
//# sourceMappingURL=sprints.controller.js.map