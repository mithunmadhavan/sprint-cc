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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprintRoleSchema = exports.SprintRole = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let SprintRole = class SprintRole {
};
exports.SprintRole = SprintRole;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SprintRole.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        type: String,
        enum: ['team', 'non-team'],
        default: 'team',
    }),
    __metadata("design:type", String)
], SprintRole.prototype, "roleType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], SprintRole.prototype, "isCapacity", void 0);
exports.SprintRole = SprintRole = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'sprint_roles' })
], SprintRole);
exports.SprintRoleSchema = mongoose_1.SchemaFactory.createForClass(SprintRole);
exports.SprintRoleSchema.index({ name: 1 }, { unique: true });
//# sourceMappingURL=sprint-role.schema.js.map