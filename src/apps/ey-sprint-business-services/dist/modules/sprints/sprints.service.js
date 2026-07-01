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
exports.SprintsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const sprint_schema_1 = require("./schemas/sprint.schema");
const submission_schema_1 = require("../submissions/schemas/submission.schema");
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SPRINT_DURATION_DAYS = 14;
function addDays(baseDate, days) {
    return new Date(baseDate.getTime() + days * DAY_MS);
}
function normalizeSprintName(value) {
    return String(value ?? '').trim();
}
function sprintDurationDays(start, end) {
    const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS) + 1;
    return Math.max(1, days);
}
function sprintOrderInPi(sprintName) {
    const name = normalizeSprintName(sprintName);
    const ipMatch = name.match(/^(\d+)\.IP(?:\s*\((\d+)\))?$/i);
    if (ipMatch) {
        const variant = ipMatch[2] ? Number(ipMatch[2]) : 1;
        return 5 + variant;
    }
    const numericMatch = name.match(/^(\d+)\.(\d+)$/);
    if (numericMatch) {
        return Number(numericMatch[2]);
    }
    return Number.MAX_SAFE_INTEGER;
}
function isIpSprintName(name) {
    return /^\d+\.IP(?:\s*\(\d+\))?$/i.test(normalizeSprintName(name));
}
function computeNextSprintName(currentSprintName) {
    const name = normalizeSprintName(currentSprintName);
    const ipMatch = name.match(/^(\d+)\.IP(?:\s*\((\d+)\))?$/i);
    if (ipMatch) {
        const pi = ipMatch[1];
        const variant = ipMatch[2] ? Number(ipMatch[2]) + 1 : 2;
        return `${pi}.IP (${variant})`;
    }
    const numericMatch = name.match(/^(\d+)\.(\d+)$/);
    if (numericMatch) {
        return `${numericMatch[1]}.${Number(numericMatch[2]) + 1}`;
    }
    throw new common_1.BadRequestException(`Cannot derive next sprint name from "${name}"`);
}
function pickLastSprintInPi(sprints = []) {
    if (!sprints.length)
        return null;
    return [...sprints].sort((a, b) => {
        const orderDiff = sprintOrderInPi(b.sprint) - sprintOrderInPi(a.sprint);
        if (orderDiff !== 0)
            return orderDiff;
        return new Date(b.start).getTime() - new Date(a.start).getTime();
    })[0];
}
function sortSprintsForReflow(a, b) {
    if (a.pi !== b.pi)
        return a.pi - b.pi;
    const orderA = sprintOrderInPi(a.sprint);
    const orderB = sprintOrderInPi(b.sprint);
    if (orderA !== orderB)
        return orderA - orderB;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
}
function toUtcDateKey(value) {
    return new Date(value).toISOString().slice(0, 10);
}
function isTodayOrPast(value) {
    return toUtcDateKey(value) <= toUtcDateKey(new Date());
}
let SprintsService = class SprintsService {
    constructor(sprintModel, submissionModel) {
        this.sprintModel = sprintModel;
        this.submissionModel = submissionModel;
    }
    toPiNumber(value) {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) {
            throw new common_1.BadRequestException('PI must be a positive integer');
        }
        return n;
    }
    assertValidDateRange(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (Number.isNaN(startDate.getTime())) {
            throw new common_1.BadRequestException('start must be a valid date');
        }
        if (Number.isNaN(endDate.getTime())) {
            throw new common_1.BadRequestException('end must be a valid date');
        }
        if (endDate < startDate) {
            throw new common_1.BadRequestException('Sprint end date must be on or after the start date');
        }
        return { startDate, endDate };
    }
    async getLastSprintInPi(pi) {
        const sprints = await this.sprintModel.find({ pi }).lean();
        return pickLastSprintInPi(sprints);
    }
    async getPreviousSprintInPi(sprint) {
        const piSprints = await this.sprintModel.find({ pi: sprint.pi }).lean();
        const order = sprintOrderInPi(sprint.sprint);
        return pickLastSprintInPi(piSprints.filter((item) => String(item._id) !== String(sprint._id) && sprintOrderInPi(item.sprint) < order));
    }
    async getPiStartSprint(pi) {
        const first = await this.sprintModel.findOne({ pi, sprint: `${pi}.1` }).lean();
        if (first)
            return first;
        return this.sprintModel.findOne({ pi }).sort({ start: 1 }).lean();
    }
    async resolveNextAvailableSprintName(currentSprintName, pi) {
        const existingNames = new Set((await this.sprintModel.find({ pi }, { sprint: 1 }).lean()).map((s) => normalizeSprintName(s.sprint)));
        let candidate = computeNextSprintName(currentSprintName);
        let guard = 0;
        while (existingNames.has(candidate)) {
            guard += 1;
            if (guard > 100) {
                throw new common_1.BadRequestException(`Unable to find available sprint name after "${currentSprintName}"`);
            }
            candidate = computeNextSprintName(candidate);
        }
        return candidate;
    }
    async reflowTrailingSprints(fromSprint, options = {}) {
        const { excludeId = null } = options;
        const currentPi = fromSprint.pi;
        const currentOrder = sprintOrderInPi(fromSprint.sprint);
        const candidates = await this.sprintModel.find({
            $or: [{ pi: { $gt: currentPi } }, { pi: currentPi }],
        });
        const trailing = candidates
            .filter((item) => {
            if (excludeId && String(item._id) === String(excludeId))
                return false;
            if (String(item._id) === String(fromSprint._id))
                return false;
            if (item.pi > currentPi)
                return true;
            return sprintOrderInPi(item.sprint) > currentOrder;
        })
            .sort(sortSprintsForReflow);
        let nextStart = addDays(new Date(fromSprint.end), 1);
        for (const item of trailing) {
            const duration = sprintDurationDays(item.start, item.end);
            item.start = new Date(nextStart);
            item.end = addDays(new Date(nextStart), duration - 1);
            item.updatedAt = new Date();
            await item.save();
            nextStart = addDays(new Date(item.end), 1);
        }
        return trailing;
    }
    async reflowScheduledSprintsAfter(fromSprint) {
        const samePiTrailing = await this.sprintModel
            .find({
            pi: fromSprint.pi,
            _id: { $ne: fromSprint._id },
            start: { $gte: new Date(fromSprint.start) },
        })
            .sort({ start: 1 });
        let nextStart = addDays(new Date(fromSprint.end), 1);
        for (const item of samePiTrailing) {
            const duration = sprintDurationDays(item.start, item.end);
            item.start = new Date(nextStart);
            item.end = addDays(new Date(nextStart), duration - 1);
            item.updatedAt = new Date();
            await item.save();
            nextStart = addDays(new Date(item.end), 1);
        }
        const higherPiTrailing = await this.sprintModel.find({ pi: { $gt: fromSprint.pi } });
        higherPiTrailing.sort(sortSprintsForReflow);
        for (const item of higherPiTrailing) {
            const duration = sprintDurationDays(item.start, item.end);
            item.start = new Date(nextStart);
            item.end = addDays(new Date(nextStart), duration - 1);
            item.updatedAt = new Date();
            await item.save();
            nextStart = addDays(new Date(item.end), 1);
        }
        return [...samePiTrailing, ...higherPiTrailing];
    }
    async listSprints(filters = {}) {
        const query = {};
        if (filters.sprint) {
            query.sprint = { $regex: filters.sprint, $options: 'i' };
        }
        if (filters.pi) {
            query.pi = this.toPiNumber(filters.pi);
        }
        if (filters.startDateFrom || filters.startDateTo) {
            query.start = {};
            if (filters.startDateFrom)
                query.start.$gte = new Date(filters.startDateFrom);
            if (filters.startDateTo)
                query.start.$lte = new Date(filters.startDateTo);
        }
        if (filters.endDateFrom || filters.endDateTo) {
            query.end = {};
            if (filters.endDateFrom)
                query.end.$gte = new Date(filters.endDateFrom);
            if (filters.endDateTo)
                query.end.$lte = new Date(filters.endDateTo);
        }
        const sprints = await this.sprintModel.find(query).lean();
        const now = new Date();
        const threeWeeksAgo = new Date(now.getTime() - 21 * DAY_MS);
        const recent = sprints
            .filter((s) => new Date(s.end) >= threeWeeksAgo)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const old = sprints
            .filter((s) => new Date(s.end) < threeWeeksAgo)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        return [...recent, ...old];
    }
    async getSprint(id) {
        const sprint = await this.sprintModel.findById(id);
        if (!sprint) {
            throw new common_1.NotFoundException('Sprint not found');
        }
        return sprint;
    }
    async createSprint(data) {
        const { startDate, endDate } = this.assertValidDateRange(data.start, data.end);
        const sprint = new this.sprintModel({
            sprint: normalizeSprintName(data.sprint),
            pi: this.toPiNumber(data.pi),
            start: startDate,
            end: endDate,
        });
        return sprint.save();
    }
    async updateSprint(id, data) {
        const sprint = await this.sprintModel.findById(id);
        if (!sprint)
            throw new common_1.NotFoundException('Sprint not found');
        const piStartSprint = await this.getPiStartSprint(sprint.pi);
        if (piStartSprint && isTodayOrPast(piStartSprint.start)) {
            throw new common_1.BadRequestException(`Cannot edit sprint ${sprint.sprint}: PI ${sprint.pi} has already started`);
        }
        const hasStart = data.start !== undefined && data.start !== null && data.start !== '';
        const hasEnd = data.end !== undefined && data.end !== null && data.end !== '';
        const originalDuration = sprintDurationDays(sprint.start, sprint.end);
        if (data.sprint !== undefined && data.sprint !== null && data.sprint !== '') {
            sprint.sprint = normalizeSprintName(data.sprint);
        }
        if (data.pi !== undefined && data.pi !== null && data.pi !== '') {
            sprint.pi = this.toPiNumber(data.pi);
        }
        if (hasStart)
            sprint.start = new Date(data.start);
        if (hasEnd)
            sprint.end = new Date(data.end);
        if (hasStart && !hasEnd) {
            sprint.end = addDays(new Date(sprint.start), originalDuration - 1);
        }
        this.assertValidDateRange(sprint.start, sprint.end);
        sprint.updatedAt = new Date();
        await sprint.save();
        let reflowed = [];
        if (hasStart || hasEnd) {
            reflowed = await this.reflowTrailingSprints(sprint);
        }
        return {
            sprint,
            reflowedCount: reflowed.length,
            reflowedSprints: reflowed.map((item) => item.sprint),
        };
    }
    async deleteSprint(id) {
        const sprint = await this.sprintModel.findById(id);
        if (!sprint)
            throw new common_1.NotFoundException('Sprint not found');
        if (isIpSprintName(sprint.sprint)) {
            throw new common_1.BadRequestException(`Cannot delete sprint ${sprint.sprint}: IP sprints cannot be deleted`);
        }
        const currentSprint = await this.getLastSprintInPi(sprint.pi);
        if (currentSprint && isIpSprintName(currentSprint.sprint)) {
            throw new common_1.BadRequestException(`Cannot delete sprint ${sprint.sprint}: PI ${sprint.pi} is already in IP`);
        }
        if (isTodayOrPast(sprint.start)) {
            throw new common_1.BadRequestException(`Cannot delete sprint ${sprint.sprint}: sprint has already started`);
        }
        const submissionResult = await this.submissionModel.deleteMany({ SprintNo: sprint.sprint });
        const deleted = sprint.toObject();
        const previous = await this.getPreviousSprintInPi(sprint);
        const pi = sprint.pi;
        await this.sprintModel.deleteOne({ _id: sprint._id });
        if (previous) {
            const anchor = await this.sprintModel.findById(previous._id);
            if (anchor)
                await this.reflowScheduledSprintsAfter(anchor);
        }
        else if (pi > 1) {
            const priorPiLast = await this.getLastSprintInPi(pi - 1);
            if (priorPiLast) {
                const anchor = await this.sprintModel.findById(priorPiLast._id);
                if (anchor)
                    await this.reflowScheduledSprintsAfter(anchor);
            }
        }
        return { ...deleted, submissionsDeleted: submissionResult.deletedCount || 0 };
    }
    async listAddSprintOptions() {
        const allSprints = await this.sprintModel.find().lean();
        const today = new Date();
        const piNumbers = [...new Set(allSprints.map((s) => s.pi))].sort((a, b) => Number(a) - Number(b));
        const options = [];
        for (const pi of piNumbers) {
            const piSprints = allSprints.filter((s) => s.pi === pi);
            const ipSprint = piSprints.find((s) => isIpSprintName(s.sprint));
            if (ipSprint && new Date(ipSprint.start) <= today)
                continue;
            const nonIpSprints = piSprints.filter((s) => !isIpSprintName(s.sprint));
            const current = pickLastSprintInPi(nonIpSprints.length ? nonIpSprints : piSprints);
            if (!current)
                continue;
            if (isIpSprintName(current.sprint))
                continue;
            const nextSprintName = await this.resolveNextAvailableSprintName(current.sprint, Number(pi));
            const nextStart = addDays(new Date(current.end), 1);
            options.push({
                pi,
                currentSprint: current.sprint,
                currentSprintEnd: current.end,
                nextSprintName,
                nextStart,
                nextEnd: addDays(new Date(nextStart), DEFAULT_SPRINT_DURATION_DAYS - 1),
            });
        }
        return options;
    }
    async createNewSprintInExistingPi(piNumber) {
        const pi = this.toPiNumber(piNumber);
        const today = new Date();
        const allPiSprints = await this.sprintModel.find({ pi }).lean();
        const ipSprint = allPiSprints.find((s) => isIpSprintName(s.sprint));
        if (ipSprint && new Date(ipSprint.start) <= today) {
            throw new common_1.BadRequestException('PI is already in IP no new sprint can be added');
        }
        const nonIpSprints = allPiSprints.filter((s) => !isIpSprintName(s.sprint));
        const currentSprint = pickLastSprintInPi(nonIpSprints.length ? nonIpSprints : allPiSprints);
        if (!currentSprint) {
            throw new common_1.BadRequestException(`PI ${pi} has no sprints to extend`);
        }
        if (isIpSprintName(currentSprint.sprint)) {
            throw new common_1.BadRequestException('PI is already in IP no new sprint can be added');
        }
        const nextName = await this.resolveNextAvailableSprintName(currentSprint.sprint, pi);
        const start = addDays(new Date(currentSprint.end), 1);
        const end = addDays(new Date(start), DEFAULT_SPRINT_DURATION_DAYS - 1);
        const newSprint = await this.createSprint({
            sprint: nextName,
            pi,
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const reflowed = await this.reflowScheduledSprintsAfter(newSprint);
        return {
            pi,
            currentSprint: currentSprint.sprint,
            lastSprint: currentSprint.sprint,
            sprint: newSprint,
            reflowedCount: reflowed.length,
        };
    }
    async getNotStartedPiNumbers() {
        const now = new Date();
        const firstSprints = await this.sprintModel.find({ sprint: { $regex: /^\d+\.1$/ } }).lean();
        const notStarted = firstSprints.filter((s) => new Date(s.start) > now);
        return [...new Set(notStarted.map((s) => s.pi))];
    }
    buildPiBatch(pi, startDate) {
        const sprintSuffixes = ['1', '2', '3', '4', '5', 'IP'];
        const sprints = sprintSuffixes.map((suffix, index) => {
            const start = addDays(startDate, index * 14);
            const end = addDays(start, 13);
            return {
                sprint: `${pi}.${suffix}`,
                pi,
                start,
                end,
            };
        });
        return { pi, sprints };
    }
    async computeNextPiBatch(initialPiInput) {
        const notStartedPis = await this.getNotStartedPiNumbers();
        if (notStartedPis.length >= 2) {
            throw new common_1.BadRequestException(`Cannot create PI: already have two PIs that have not started (PI ${notStartedPis
                .sort((a, b) => a - b)
                .join(', ')})`);
        }
        const latestCompletedPiIp = await this.sprintModel
            .findOne({ sprint: { $regex: /^\s*\d+\.IP\s*$/i } })
            .sort({ pi: -1 })
            .lean();
        if (!latestCompletedPiIp) {
            if (initialPiInput === undefined || initialPiInput === null || String(initialPiInput).trim() === '') {
                throw new common_1.BadRequestException('No existing PI found. Provide an initial PI number to bootstrap PI planning.');
            }
            const initialPi = this.toPiNumber(initialPiInput);
            return this.buildPiBatch(initialPi, new Date());
        }
        const latestPi = await this.sprintModel.findOne().sort({ pi: -1 }).lean();
        if (latestPi && latestPi.pi > latestCompletedPiIp.pi) {
            throw new common_1.BadRequestException(`Cannot create PI: missing ${latestPi.pi}.IP sprint in latest PI`);
        }
        const nextPi = latestCompletedPiIp.pi + 1;
        const startDate = addDays(new Date(latestCompletedPiIp.end), 1);
        return this.buildPiBatch(nextPi, startDate);
    }
    async previewNextPiBatch(initialPiInput) {
        return this.computeNextPiBatch(initialPiInput);
    }
    async createNextPiBatch(initialPiInput) {
        const plan = await this.computeNextPiBatch(initialPiInput);
        return this.sprintModel.insertMany(plan.sprints, { ordered: true });
    }
    async deletePiBatch(piNumber) {
        const pi = this.toPiNumber(piNumber);
        const firstSprint = await this.getPiStartSprint(pi);
        if (!firstSprint) {
            throw new common_1.NotFoundException(`PI ${pi}: PI not found or missing ${pi}.1 sprint`);
        }
        if (isTodayOrPast(firstSprint.start)) {
            throw new common_1.BadRequestException(`Cannot delete PI ${pi}: PI has already started`);
        }
        const higherPi = await this.sprintModel.findOne({ pi: { $gt: pi } }).lean();
        if (higherPi) {
            throw new common_1.BadRequestException(`Cannot delete PI ${pi}: PI ${higherPi.pi} exists. Delete higher PIs first.`);
        }
        const piSprintDocs = await this.sprintModel.find({ pi }, { sprint: 1 }).lean();
        const sprintNames = piSprintDocs.map((s) => s.sprint);
        const submissionCount = await this.submissionModel.countDocuments({ SprintNo: { $in: sprintNames } });
        if (submissionCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete PI ${pi}: ${submissionCount} submission(s) exist for this PI's sprints`);
        }
        const result = await this.sprintModel.deleteMany({ pi });
        return { pi, deleted: result.deletedCount };
    }
};
exports.SprintsService = SprintsService;
exports.SprintsService = SprintsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(sprint_schema_1.Sprint.name)),
    __param(1, (0, mongoose_1.InjectModel)(submission_schema_1.Submission.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], SprintsService);
//# sourceMappingURL=sprints.service.js.map