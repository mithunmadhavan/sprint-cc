import { Model } from 'mongoose';
import { UpsertSubmissionDto } from './dto/upsert-submission.dto';
import { SubmissionDocument } from './schemas/submission.schema';
import { SprintDocument } from '../sprints/schemas/sprint.schema';
export declare class SubmissionsService {
    private readonly submissionModel;
    private readonly sprintModel;
    constructor(submissionModel: Model<SubmissionDocument>, sprintModel: Model<SprintDocument>);
    private resolveSprintWindow;
    private assertSubmissionFieldWindows;
    listSubmissions(filters?: Record<string, any>): Promise<(import("mongoose").FlattenMaps<SubmissionDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getSubmission(teamKey: string, sprintNo: string): Promise<(import("mongoose").FlattenMaps<SubmissionDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    upsertSubmission(payload: UpsertSubmissionDto): Promise<{
        isReplace: boolean;
    }>;
    getHealth(): {
        ok: boolean;
        service: string;
        ts: string;
    };
}
