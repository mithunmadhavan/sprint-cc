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
exports.SubmissionSchema = exports.Submission = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let RosterMember = class RosterMember {
};
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], RosterMember.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], RosterMember.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RosterMember.prototype, "ph", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RosterMember.prototype, "al", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RosterMember.prototype, "other", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RosterMember.prototype, "pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], RosterMember.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RosterMember.prototype, "AvailableDays", void 0);
RosterMember = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], RosterMember);
const RosterMemberSchema = mongoose_1.SchemaFactory.createForClass(RosterMember);
let Submission = class Submission {
};
exports.Submission = Submission;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Submission.prototype, "Team", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Submission.prototype, "ProjectKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Submission.prototype, "SprintNo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "PI", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "SprintStart", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "SprintEnd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "submittedDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "submittedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'normal' }),
    __metadata("design:type", String)
], Submission.prototype, "submittedRole", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "TeamSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "TotalDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "SprintOverhead", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0, max: 100 }),
    __metadata("design:type", Number)
], Submission.prototype, "ProductHealth", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "ProductHealthReduction", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "SprintCapacity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "DevCapacityDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "TestCapacityDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "DevPercent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Submission.prototype, "TestPercent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null, min: 0 }),
    __metadata("design:type", Object)
], Submission.prototype, "SprintGoal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null, min: 0 }),
    __metadata("design:type", Object)
], Submission.prototype, "GoalsAchieved", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Submission.prototype, "Objectives", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Submission.prototype, "Notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [RosterMemberSchema], default: [] }),
    __metadata("design:type", Array)
], Submission.prototype, "Roster", void 0);
exports.Submission = Submission = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Submission);
exports.SubmissionSchema = mongoose_1.SchemaFactory.createForClass(Submission);
exports.SubmissionSchema.index({ ProjectKey: 1, SprintNo: 1 }, { unique: true });
//# sourceMappingURL=submission.schema.js.map