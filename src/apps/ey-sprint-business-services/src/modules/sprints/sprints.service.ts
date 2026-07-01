import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { Sprint, SprintDocument } from './schemas/sprint.schema';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SPRINT_DURATION_DAYS = 14;

function addDays(baseDate: Date, days: number) {
  return new Date(baseDate.getTime() + days * DAY_MS);
}

function normalizeSprintName(value: unknown) {
  return String(value ?? '').trim();
}

function sprintDurationDays(start: Date | string, end: Date | string) {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS) + 1;
  return Math.max(1, days);
}

function sprintOrderInPi(sprintName: string) {
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

function isIpSprintName(name: string) {
  return /^\d+\.IP(?:\s*\(\d+\))?$/i.test(normalizeSprintName(name));
}

function computeNextSprintName(currentSprintName: string) {
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
  throw new BadRequestException(`Cannot derive next sprint name from "${name}"`);
}

function pickLastSprintInPi(sprints: any[] = []) {
  if (!sprints.length) return null;
  return [...sprints].sort((a, b) => {
    const orderDiff = sprintOrderInPi(b.sprint) - sprintOrderInPi(a.sprint);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.start).getTime() - new Date(a.start).getTime();
  })[0];
}

function sortSprintsForReflow(a: any, b: any) {
  if (a.pi !== b.pi) return a.pi - b.pi;
  const orderA = sprintOrderInPi(a.sprint);
  const orderB = sprintOrderInPi(b.sprint);
  if (orderA !== orderB) return orderA - orderB;
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

function toUtcDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function isTodayOrPast(value: Date | string) {
  return toUtcDateKey(value) <= toUtcDateKey(new Date());
}

@Injectable()
export class SprintsService {
  constructor(
    @InjectModel(Sprint.name) private readonly sprintModel: Model<SprintDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
  ) {}

  private toPiNumber(value: unknown) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new BadRequestException('PI must be a positive integer');
    }
    return n;
  }

  private assertValidDateRange(start: unknown, end: unknown) {
    const startDate = new Date(start as any);
    const endDate = new Date(end as any);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('start must be a valid date');
    }
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('end must be a valid date');
    }
    if (endDate < startDate) {
      throw new BadRequestException('Sprint end date must be on or after the start date');
    }
    return { startDate, endDate };
  }

  private async getLastSprintInPi(pi: number) {
    const sprints = await this.sprintModel.find({ pi }).lean();
    return pickLastSprintInPi(sprints as any[]);
  }

  private async getPreviousSprintInPi(sprint: any) {
    const piSprints = await this.sprintModel.find({ pi: sprint.pi }).lean();
    const order = sprintOrderInPi(sprint.sprint);
    return pickLastSprintInPi(
      (piSprints as any[]).filter(
        (item) => String(item._id) !== String(sprint._id) && sprintOrderInPi(item.sprint) < order,
      ),
    );
  }

  private async getPiStartSprint(pi: number) {
    const first = await this.sprintModel.findOne({ pi, sprint: `${pi}.1` }).lean();
    if (first) return first;
    return this.sprintModel.findOne({ pi }).sort({ start: 1 }).lean();
  }

  private async resolveNextAvailableSprintName(currentSprintName: string, pi: number) {
    const existingNames = new Set(
      (await this.sprintModel.find({ pi }, { sprint: 1 }).lean()).map((s: any) =>
        normalizeSprintName(s.sprint),
      ),
    );
    let candidate = computeNextSprintName(currentSprintName);
    let guard = 0;
    while (existingNames.has(candidate)) {
      guard += 1;
      if (guard > 100) {
        throw new BadRequestException(
          `Unable to find available sprint name after "${currentSprintName}"`,
        );
      }
      candidate = computeNextSprintName(candidate);
    }
    return candidate;
  }

  private async reflowTrailingSprints(fromSprint: any, options: { excludeId?: string } = {}) {
    const { excludeId = null } = options;
    const currentPi = fromSprint.pi;
    const currentOrder = sprintOrderInPi(fromSprint.sprint);

    const candidates = await this.sprintModel.find({
      $or: [{ pi: { $gt: currentPi } }, { pi: currentPi }],
    });

    const trailing = candidates
      .filter((item: any) => {
        if (excludeId && String(item._id) === String(excludeId)) return false;
        if (String(item._id) === String(fromSprint._id)) return false;
        if (item.pi > currentPi) return true;
        return sprintOrderInPi(item.sprint) > currentOrder;
      })
      .sort(sortSprintsForReflow);

    let nextStart = addDays(new Date(fromSprint.end), 1);
    for (const item of trailing) {
      const duration = sprintDurationDays(item.start, item.end);
      item.start = new Date(nextStart);
      item.end = addDays(new Date(nextStart), duration - 1);
      item.updatedAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await item.save();
      nextStart = addDays(new Date(item.end), 1);
    }

    return trailing;
  }

  private async reflowScheduledSprintsAfter(fromSprint: any) {
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
      // eslint-disable-next-line no-await-in-loop
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
      // eslint-disable-next-line no-await-in-loop
      await item.save();
      nextStart = addDays(new Date(item.end), 1);
    }

    return [...samePiTrailing, ...higherPiTrailing];
  }

  async listSprints(filters: Record<string, any> = {}) {
    const query: Record<string, any> = {};

    if (filters.sprint) {
      query.sprint = { $regex: filters.sprint, $options: 'i' };
    }

    if (filters.pi) {
      query.pi = this.toPiNumber(filters.pi);
    }

    if (filters.startDateFrom || filters.startDateTo) {
      query.start = {};
      if (filters.startDateFrom) query.start.$gte = new Date(filters.startDateFrom);
      if (filters.startDateTo) query.start.$lte = new Date(filters.startDateTo);
    }

    if (filters.endDateFrom || filters.endDateTo) {
      query.end = {};
      if (filters.endDateFrom) query.end.$gte = new Date(filters.endDateFrom);
      if (filters.endDateTo) query.end.$lte = new Date(filters.endDateTo);
    }

    const sprints = await this.sprintModel.find(query).lean();
    const now = new Date();
    const threeWeeksAgo = new Date(now.getTime() - 21 * DAY_MS);
    const recent = (sprints as any[])
      .filter((s) => new Date(s.end) >= threeWeeksAgo)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const old = (sprints as any[])
      .filter((s) => new Date(s.end) < threeWeeksAgo)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return [...recent, ...old];
  }

  async getSprint(id: string) {
    const sprint = await this.sprintModel.findById(id);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    return sprint;
  }

  async createSprint(data: CreateSprintDto) {
    const { startDate, endDate } = this.assertValidDateRange(data.start, data.end);
    const sprint = new this.sprintModel({
      sprint: normalizeSprintName(data.sprint),
      pi: this.toPiNumber(data.pi),
      start: startDate,
      end: endDate,
    });
    return sprint.save();
  }

  async updateSprint(id: string, data: UpdateSprintDto) {
    const sprint = await this.sprintModel.findById(id);
    if (!sprint) throw new NotFoundException('Sprint not found');

    const piStartSprint = await this.getPiStartSprint(sprint.pi);
    if (piStartSprint && isTodayOrPast((piStartSprint as any).start)) {
      throw new BadRequestException(
        `Cannot edit sprint ${sprint.sprint}: PI ${sprint.pi} has already started`,
      );
    }

    const hasStart = data.start !== undefined && data.start !== null && data.start !== '';
    const hasEnd = data.end !== undefined && data.end !== null && data.end !== '';
    const originalDuration = sprintDurationDays(sprint.start, sprint.end);

    if (data.sprint !== undefined && data.sprint !== null && data.sprint !== '') {
      sprint.sprint = normalizeSprintName(data.sprint);
    }
    if (data.pi !== undefined && data.pi !== null && (data.pi as any) !== '') {
      sprint.pi = this.toPiNumber(data.pi);
    }
    if (hasStart) sprint.start = new Date(data.start as string);
    if (hasEnd) sprint.end = new Date(data.end as string);

    if (hasStart && !hasEnd) {
      sprint.end = addDays(new Date(sprint.start), originalDuration - 1);
    }

    this.assertValidDateRange(sprint.start, sprint.end);

    sprint.updatedAt = new Date();
    await sprint.save();

    let reflowed: any[] = [];
    if (hasStart || hasEnd) {
      reflowed = await this.reflowTrailingSprints(sprint);
    }

    return {
      sprint,
      reflowedCount: reflowed.length,
      reflowedSprints: reflowed.map((item) => item.sprint),
    };
  }

  async deleteSprint(id: string) {
    const sprint = await this.sprintModel.findById(id);
    if (!sprint) throw new NotFoundException('Sprint not found');

    if (isIpSprintName(sprint.sprint)) {
      throw new BadRequestException(`Cannot delete sprint ${sprint.sprint}: IP sprints cannot be deleted`);
    }

    const currentSprint = await this.getLastSprintInPi(sprint.pi);
    if (currentSprint && isIpSprintName((currentSprint as any).sprint)) {
      throw new BadRequestException(
        `Cannot delete sprint ${sprint.sprint}: PI ${sprint.pi} is already in IP`,
      );
    }

    if (isTodayOrPast(sprint.start)) {
      throw new BadRequestException(`Cannot delete sprint ${sprint.sprint}: sprint has already started`);
    }

    const submissionResult = await this.submissionModel.deleteMany({ SprintNo: sprint.sprint });

    const deleted = sprint.toObject();
    const previous = await this.getPreviousSprintInPi(sprint);
    const pi = sprint.pi;

    await this.sprintModel.deleteOne({ _id: sprint._id });

    if (previous) {
      const anchor = await this.sprintModel.findById((previous as any)._id);
      if (anchor) await this.reflowScheduledSprintsAfter(anchor);
    } else if (pi > 1) {
      const priorPiLast = await this.getLastSprintInPi(pi - 1);
      if (priorPiLast) {
        const anchor = await this.sprintModel.findById((priorPiLast as any)._id);
        if (anchor) await this.reflowScheduledSprintsAfter(anchor);
      }
    }

    return { ...deleted, submissionsDeleted: submissionResult.deletedCount || 0 };
  }

  async listAddSprintOptions() {
    const allSprints = await this.sprintModel.find().lean();
    const today = new Date();
    const piNumbers = [...new Set((allSprints as any[]).map((s) => s.pi))].sort(
      (a, b) => Number(a) - Number(b),
    );
    const options: any[] = [];

    for (const pi of piNumbers) {
      const piSprints = (allSprints as any[]).filter((s) => s.pi === pi);

      const ipSprint = piSprints.find((s) => isIpSprintName(s.sprint));
      if (ipSprint && new Date(ipSprint.start) <= today) continue;

      const nonIpSprints = piSprints.filter((s) => !isIpSprintName(s.sprint));
      const current = pickLastSprintInPi(nonIpSprints.length ? nonIpSprints : piSprints);
      if (!current) continue;
      if (isIpSprintName(current.sprint)) continue;

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

  async createNewSprintInExistingPi(piNumber: number) {
    const pi = this.toPiNumber(piNumber);
    const today = new Date();

    const allPiSprints = await this.sprintModel.find({ pi }).lean();

    const ipSprint = (allPiSprints as any[]).find((s) => isIpSprintName(s.sprint));
    if (ipSprint && new Date(ipSprint.start) <= today) {
      throw new BadRequestException('PI is already in IP no new sprint can be added');
    }

    const nonIpSprints = (allPiSprints as any[]).filter((s) => !isIpSprintName(s.sprint));
    const currentSprint = pickLastSprintInPi(nonIpSprints.length ? nonIpSprints : (allPiSprints as any[]));
    if (!currentSprint) {
      throw new BadRequestException(`PI ${pi} has no sprints to extend`);
    }
    if (isIpSprintName(currentSprint.sprint)) {
      throw new BadRequestException('PI is already in IP no new sprint can be added');
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

  private async getNotStartedPiNumbers() {
    const now = new Date();
    const firstSprints = await this.sprintModel.find({ sprint: { $regex: /^\d+\.1$/ } }).lean();
    const notStarted = (firstSprints as any[]).filter((s) => new Date(s.start) > now);
    return [...new Set(notStarted.map((s) => s.pi))];
  }

  private buildPiBatch(pi: number, startDate: Date) {
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

  private async computeNextPiBatch(initialPiInput?: unknown) {
    const notStartedPis = await this.getNotStartedPiNumbers();

    if (notStartedPis.length >= 2) {
      throw new BadRequestException(
        `Cannot create PI: already have two PIs that have not started (PI ${notStartedPis
          .sort((a, b) => a - b)
          .join(', ')})`,
      );
    }

    const latestCompletedPiIp = await this.sprintModel
      .findOne({ sprint: { $regex: /^\s*\d+\.IP\s*$/i } })
      .sort({ pi: -1 })
      .lean();

    if (!latestCompletedPiIp) {
      if (initialPiInput === undefined || initialPiInput === null || String(initialPiInput).trim() === '') {
        throw new BadRequestException(
          'No existing PI found. Provide an initial PI number to bootstrap PI planning.',
        );
      }
      const initialPi = this.toPiNumber(initialPiInput);
      return this.buildPiBatch(initialPi, new Date());
    }

    const latestPi = await this.sprintModel.findOne().sort({ pi: -1 }).lean();
    if (latestPi && (latestPi as any).pi > (latestCompletedPiIp as any).pi) {
      throw new BadRequestException(
        `Cannot create PI: missing ${(latestPi as any).pi}.IP sprint in latest PI`,
      );
    }

    const nextPi = (latestCompletedPiIp as any).pi + 1;
    const startDate = addDays(new Date((latestCompletedPiIp as any).end), 1);
    return this.buildPiBatch(nextPi, startDate);
  }

  async previewNextPiBatch(initialPiInput?: unknown) {
    return this.computeNextPiBatch(initialPiInput);
  }

  async createNextPiBatch(initialPiInput?: unknown) {
    const plan = await this.computeNextPiBatch(initialPiInput);
    return this.sprintModel.insertMany(plan.sprints, { ordered: true });
  }

  async deletePiBatch(piNumber: string) {
    const pi = this.toPiNumber(piNumber);
    const firstSprint = await this.getPiStartSprint(pi);

    if (!firstSprint) {
      throw new NotFoundException(`PI ${pi}: PI not found or missing ${pi}.1 sprint`);
    }

    if (isTodayOrPast((firstSprint as any).start)) {
      throw new BadRequestException(`Cannot delete PI ${pi}: PI has already started`);
    }

    const higherPi = await this.sprintModel.findOne({ pi: { $gt: pi } }).lean();
    if (higherPi) {
      throw new BadRequestException(
        `Cannot delete PI ${pi}: PI ${(higherPi as any).pi} exists. Delete higher PIs first.`,
      );
    }

    const piSprintDocs = await this.sprintModel.find({ pi }, { sprint: 1 }).lean();
    const sprintNames = (piSprintDocs as any[]).map((s) => s.sprint);
    const submissionCount = await this.submissionModel.countDocuments({ SprintNo: { $in: sprintNames } });
    if (submissionCount > 0) {
      throw new BadRequestException(
        `Cannot delete PI ${pi}: ${submissionCount} submission(s) exist for this PI's sprints`,
      );
    }

    const result = await this.sprintModel.deleteMany({ pi });
    return { pi, deleted: result.deletedCount };
  }
}
