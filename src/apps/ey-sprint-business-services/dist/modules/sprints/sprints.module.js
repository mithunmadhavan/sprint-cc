"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprintsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const sprints_controller_1 = require("./sprints.controller");
const sprints_service_1 = require("./sprints.service");
const sprint_schema_1 = require("./schemas/sprint.schema");
const submission_schema_1 = require("../submissions/schemas/submission.schema");
let SprintsModule = class SprintsModule {
};
exports.SprintsModule = SprintsModule;
exports.SprintsModule = SprintsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: sprint_schema_1.Sprint.name, schema: sprint_schema_1.SprintSchema },
                { name: submission_schema_1.Submission.name, schema: submission_schema_1.SubmissionSchema },
            ]),
        ],
        controllers: [sprints_controller_1.SprintsController],
        providers: [sprints_service_1.SprintsService],
        exports: [sprints_service_1.SprintsService],
    })
], SprintsModule);
//# sourceMappingURL=sprints.module.js.map