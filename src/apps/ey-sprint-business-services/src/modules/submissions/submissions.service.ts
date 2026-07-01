import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpsertSubmissionDto } from './dto/upsert-submission.dto';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { Sprint, SprintDocument } from '../sprints/schemas/sprint.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value: Date | string, days: number) {
  return new Date(new Date(value).getTime() + days * DAY_MS);
}

function cleanRoster(roster: any[] = []) {
  if (!Array.isArray(roster)) return [];
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

function normalizeObjectives(objectives: unknown, objective: unknown) {
  const values = Array.isArray(objectives)
    ? objectives
    : typeof objective === 'string' && objective.trim()
      ? [objective]
      : [];

  return values.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function normalizeNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException('Numeric submission fields must contain valid numbers');
  }

  return parsed;
}

function normalizePercentage(value: unknown, fieldName: string) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new BadRequestException(`${fieldName} must be a number between 0 and 100`);
  }

  return parsed;
}

function sameObjectives(left: string[] = [], right: string[] = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function sameNullableNumber(left: unknown, right: unknown) {
  return (left ?? null) === (right ?? null);
}

function sameRoster(left: any[] = [], right: any[] = []) {
  const normalizedLeft = cleanRoster(left);
  const normalizedRight = cleanRoster(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;

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

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<SprintDocument>,
  ) {}

  private async resolveSprintWindow(payload: Partial<UpsertSubmissionDto> & Record<string, any>) {
    const sprintNo = String(payload.SprintNo ?? '').trim();
    if (!sprintNo) return null;

    const sprint = await this.sprintModel.findOne({ sprint: sprintNo }).lean();
    if (sprint) {
      return {
        sprint: (sprint as any).sprint,
        pi: (sprint as any).pi,
        start: (sprint as any).start,
        end: (sprint as any).end,
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

  private assertSubmissionFieldWindows(
    sprintWindow: any,
    existing: any,
    nextPayload: Record<string, any>,
  ) {
    // Window rules are edit restrictions; allow creating a brand-new submission.
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

    const previousObjectives = normalizeObjectives(existing?.Objectives, (existing as any)?.Objective);
    const previousSprintGoal = existing?.SprintGoal ?? null;
    const previousGoalsAchieved = existing?.GoalsAchieved ?? null;
    const previousRoster = cleanRoster(existing?.Roster as any[]);
    const previousProductHealth = Number(existing?.ProductHealth || 0);

    if (!objectivesEditable && !sameObjectives(previousObjectives, nextPayload.Objectives)) {
      throw new BadRequestException(
        'Objectives can only be edited through one week after the sprint start date',
      );
    }

    if (!sprintGoalEditable && !sameNullableNumber(previousSprintGoal, nextPayload.SprintGoal)) {
      throw new BadRequestException(
        'Sprint goal can only be edited through one week after the sprint start date',
      );
    }

    if (!goalsAchievedEditable && !sameNullableNumber(previousGoalsAchieved, nextPayload.GoalsAchieved)) {
      throw new BadRequestException(
        'Goals achieved can only be edited from the sprint end date through one week after',
      );
    }

    if (!rosterEditable && !sameRoster(previousRoster, nextPayload.Roster)) {
      throw new BadRequestException(
        'Team roster can only be edited through one week after the sprint start date',
      );
    }

    if (!rosterEditable && Number(nextPayload.ProductHealth || 0) !== previousProductHealth) {
      throw new BadRequestException(
        'Product health can only be edited through one week after the sprint start date',
      );
    }
  }

  async listSubmissions(filters: Record<string, any> = {}) {
    const query: Record<string, any> = {};

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

  async getSubmission(teamKey: string, sprintNo: string) {
    return this.submissionModel
      .findOne({
        ProjectKey: String(teamKey).trim().toUpperCase(),
        SprintNo: String(sprintNo).trim(),
      })
      .lean();
  }

  async upsertSubmission(payload: UpsertSubmissionDto) {
    const sprintWindow = await this.resolveSprintWindow(payload as any);

    const nextPayload: Record<string, any> = {
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
      Objectives: normalizeObjectives(payload.Objectives, (payload as any).Objective),
      Roster: cleanRoster(payload.Roster as any[]),
    };

    const existing = await this.getSubmission(nextPayload.ProjectKey, nextPayload.SprintNo);
    this.assertSubmissionFieldWindows(sprintWindow, existing, nextPayload);

    await this.submissionModel.findOneAndUpdate(
      { ProjectKey: nextPayload.ProjectKey, SprintNo: nextPayload.SprintNo },
      nextPayload,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    return { isReplace: Boolean(existing) };
  }

  getHealth() {
    return {
      ok: true,
      service: 'ey-sprint-business-services',
      ts: new Date().toISOString(),
    };
  }
}
