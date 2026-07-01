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
exports.SprintSchema = exports.Sprint = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Sprint = class Sprint {
};
exports.Sprint = Sprint;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, unique: true }),
    __metadata("design:type", String)
], Sprint.prototype, "sprint", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1 }),
    __metadata("design:type", Number)
], Sprint.prototype, "pi", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Sprint.prototype, "start", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Sprint.prototype, "end", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Sprint.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Sprint.prototype, "updatedAt", void 0);
exports.Sprint = Sprint = __decorate([
    (0, mongoose_1.Schema)({ collection: 'sprints' })
], Sprint);
exports.SprintSchema = mongoose_1.SchemaFactory.createForClass(Sprint);
exports.SprintSchema.index({ sprint: 1, pi: 1 }, { unique: true });
//# sourceMappingURL=sprint.schema.js.map