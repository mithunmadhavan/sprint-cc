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
exports.SubmissionsController = void 0;
const common_1 = require("@nestjs/common");
const submissions_service_1 = require("./submissions.service");
const upsert_submission_dto_1 = require("./dto/upsert-submission.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const submission_write_guard_1 = require("../../common/guards/submission-write.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const user_schema_1 = require("../users/schemas/user.schema");
let SubmissionsController = class SubmissionsController {
    constructor(submissionsService) {
        this.submissionsService = submissionsService;
    }
    getHealth() {
        return this.submissionsService.getHealth();
    }
    listSubmissions(query) {
        return this.submissionsService.listSubmissions(query);
    }
    getSubmission(teamKey, sprintNo) {
        return this.submissionsService.getSubmission(teamKey, sprintNo);
    }
    upsertSubmission(dto) {
        return this.submissionsService.upsertSubmission(dto);
    }
};
exports.SubmissionsController = SubmissionsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('submissions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "listSubmissions", null);
__decorate([
    (0, common_1.Get)('submissions/:teamKey/:sprintNo'),
    __param(0, (0, common_1.Param)('teamKey')),
    __param(1, (0, common_1.Param)('sprintNo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getSubmission", null);
__decorate([
    (0, common_1.Post)('submissions/upsert'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, submission_write_guard_1.SubmissionWriteGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.USER_ROLES.ADMIN, user_schema_1.USER_ROLES.EDITOR),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_submission_dto_1.UpsertSubmissionDto]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "upsertSubmission", null);
exports.SubmissionsController = SubmissionsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [submissions_service_1.SubmissionsService])
], SubmissionsController);
//# sourceMappingURL=submissions.controller.js.map