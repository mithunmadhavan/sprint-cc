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
exports.SubmissionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const submission_schema_1 = require("./schemas/submission.schema");
const sprint_schema_1 = require("../sprints/schemas/sprint.schema");
const DAY_MS = 24 * 60 * 60 * 1000;
function toDateKey(value) {
    return new Date(value).toISOString().slice(0, 10);
}
function addDays(value, days) {
    return new Date(new Date(value).getTime() + days * DAY_MS);
}
function cleanRoster(roster = []) {
    if (!Array.isArray(roster))
        return [];
    return roster.map((member) => ({
        name: String(member?.name ?? '').trim(),
        role: String(member?.role ?? '').trim(),
        ph: Number(member?.ph ?? 0),
        al: Number(member?.al ?? 0),
        other: Number(member?.other ?? 0),
        pct: Number(member?.pct ?? 0),
        notes: String(member?.notes ?? ''),
        AvailableDays: Number(member?.AvailableDays ?? 0),
    }));
}
function normalizeObjectives(objectives, objective) {
    const values = Array.isArray(objectives)
        ? objectives
        : typeof objective === 'string' && objective.trim()
            ? [objective]
            : [];
    return values.map((item) => String(item ?? '').trim()).filter(Boolean);
}
function normalizeNullableNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new common_1.BadRequestException('Numeric submission fields must contain valid numbers');
    }
    return parsed;
}
function normalizePercentage(value, fieldName) {
    if (value === '' || value === null || value === undefined) {
        return 0;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new common_1.BadRequestException(`${fieldName} must be a number between 0 and 100`);
    }
    return parsed;
}
function sameObjectives(left = [], right = []) {
    if (left.length !== right.length)
        return false;
    return left.every((value, index) => value === right[index]);
}
function sameNullableNumber(left, right) {
    return (left ?? null) === (right ?? null);
}
function sameRoster(left = [], right = []) {
    const normalizedLeft = cleanRoster(left);
    const normalizedRight = cleanRoster(right);
    if (normalizedLeft.length !== normalizedRight.length)
        return false;
    return normalizedLeft.every((member, index) => {
        const compare = normalizedRight[index] ?? {};
        return member.name === compare.name
            && member.role === compare.role
            && Number(member.ph || 0) === Number(compare.ph || 0)
            && Number(member.al || 0) === Number(compare.al || 0)
            && Number(member.other || 0) === Number(compare.other || 0)
            && Number(member.pct || 0) === Number(compare.pct || 0)
            && String(member.notes || '') === String(compare.notes || '')
            && Number(member.AvailableDays || 0) === Number(compare.AvailableDays || 0);
    });
}
let SubmissionsService = class SubmissionsService {
    constructor(submissionModel, sprintModel) {
        this.submissionModel = submissionModel;
        this.sprintModel = sprintModel;
    }
    async resolveSprintWindow(payload) {
        const sprintNo = String(payload.SprintNo ?? '').trim();
        if (!sprintNo)
            return null;
        const sprint = await this.sprintModel.findOne({ sprint: sprintNo }).lean();
        if (sprint) {
            return {
                sprint: sprint.sprint,
                pi: sprint.pi,
                start: sprint.start,
                end: sprint.end,
            };
        }
        if (payload.SprintStart && payload.SprintEnd) {
            return {
                sprint: sprintNo,
                pi: payload.PI || '',
                start: payload.SprintStart,
                end: payload.SprintEnd,
            };
        }
        return null;
    }
    assertSubmissionFieldWindows(sprintWindow, existing, nextPayload) {
        if (!existing) {
            return;
        }
        if (!sprintWindow?.start || !sprintWindow?.end) {
            return;
        }
        const today = toDateKey(new Date());
        const end = toDateKey(sprintWindow.end);
        const sprintStartGraceEnd = toDateKey(addDays(sprintWindow.start, 7));
        const goalsAchievedEnd = toDateKey(addDays(sprintWindow.end, 7));
        const objectivesEditable = today <= sprintStartGraceEnd;
        const sprintGoalEditable = today <= sprintStartGraceEnd;
        const goalsAchievedEditable = today >= end && today <= goalsAchievedEnd;
        const rosterEditable = today <= sprintStartGraceEnd;
        const previousObjectives = normalizeObjectives(existing?.Objectives, existing?.Objective);
        const previousSprintGoal = existing?.SprintGoal ?? null;
        const previousGoalsAchieved = existing?.GoalsAchieved ?? null;
        const previousRoster = cleanRoster(existing?.Roster);
        const previousProductHealth = Number(existing?.ProductHealth || 0);
        if (!objectivesEditable && !sameObjectives(previousObjectives, nextPayload.Objectives)) {
            throw new common_1.BadRequestException('Objectives can only be edited through one week after the sprint start date');
        }
        if (!sprintGoalEditable && !sameNullableNumber(previousSprintGoal, nextPayload.SprintGoal)) {
            throw new common_1.BadRequestException('Sprint goal can only be edited through one week after the sprint start date');
        }
        if (!goalsAchievedEditable && !sameNullableNumber(previousGoalsAchieved, nextPayload.GoalsAchieved)) {
            throw new common_1.BadRequestException('Goals achieved can only be edited from the sprint end date through one week after');
        }
        if (!rosterEditable && !sameRoster(previousRoster, nextPayload.Roster)) {
            throw new common_1.BadRequestException('Team roster can only be edited through one week after the sprint start date');
        }
        if (!rosterEditable && Number(nextPayload.ProductHealth || 0) !== previousProductHealth) {
            throw new common_1.BadRequestException('Product health can only be edited through one week after the sprint start date');
        }
    }
    async listSubmissions(filters = {}) {
        const query = {};
        if (filters.teamKey) {
            query.ProjectKey = String(filters.teamKey).trim().toUpperCase();
        }
        if (filters.sprintNo) {
            query.SprintNo = String(filters.sprintNo).trim();
        }
        let dbQuery = this.submissionModel.find(query).sort({ updatedAt: -1 });
        const limit = Number(filters.limit);
        if (Number.isInteger(limit) && limit > 0) {
            dbQuery = dbQuery.limit(limit);
        }
        return dbQuery.lean();
    }
    async getSubmission(teamKey, sprintNo) {
        return this.submissionModel
            .findOne({
            ProjectKey: String(teamKey).trim().toUpperCase(),
            SprintNo: String(sprintNo).trim(),
        })
            .lean();
    }
    async upsertSubmission(payload) {
        const sprintWindow = await this.resolveSprintWindow(payload);
        const nextPayload = {
            ...payload,
            ProjectKey: String(payload.ProjectKey ?? '').trim().toUpperCase(),
            SprintNo: String(payload.SprintNo ?? '').trim(),
            PI: sprintWindow?.pi != null ? String(sprintWindow.pi) : String(payload.PI || ''),
            SprintStart: sprintWindow?.start ? toDateKey(sprintWindow.start) : String(payload.SprintStart || ''),
            SprintEnd: sprintWindow?.end ? toDateKey(sprintWindow.end) : String(payload.SprintEnd || ''),
            SprintGoal: normalizeNullableNumber(payload.SprintGoal),
            GoalsAchieved: normalizeNullableNumber(payload.GoalsAchieved),
            ProductHealth: normalizePercentage(payload.ProductHealth, 'Product health'),
            ProductHealthReduction: Math.max(0, Number(payload.ProductHealthReduction || 0)),
            Objectives: normalizeObjectives(payload.Objectives, payload.Objective),
            Roster: cleanRoster(payload.Roster),
        };
        const existing = await this.getSubmission(nextPayload.ProjectKey, nextPayload.SprintNo);
        this.assertSubmissionFieldWindows(sprintWindow, existing, nextPayload);
        await this.submissionModel.findOneAndUpdate({ ProjectKey: nextPayload.ProjectKey, SprintNo: nextPayload.SprintNo }, nextPayload, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        });
        return { isReplace: Boolean(existing) };
    }
    getHealth() {
        return {
            ok: true,
            service: 'ey-sprint-business-services',
            ts: new Date().toISOString(),
        };
    }
};
exports.SubmissionsService = SubmissionsService;
exports.SubmissionsService = SubmissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(submission_schema_1.Submission.name)),
    __param(1, (0, mongoose_1.InjectModel)(sprint_schema_1.Sprint.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], SubmissionsService);
//# sourceMappingURL=submissions.service.js.map