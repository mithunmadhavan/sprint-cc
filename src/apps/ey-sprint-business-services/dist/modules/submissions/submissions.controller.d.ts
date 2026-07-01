import { SubmissionsService } from './submissions.service';
import { UpsertSubmissionDto } from './dto/upsert-submission.dto';
export declare class SubmissionsController {
    private readonly submissionsService;
    constructor(submissionsService: SubmissionsService);
    getHealth(): {
        ok: boolean;
        service: string;
        ts: string;
    };
    listSubmissions(query: Record<string, any>): Promise<(import("mongoose").FlattenMaps<import("./schemas/submission.schema").SubmissionDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getSubmission(teamKey: string, sprintNo: string): Promise<(import("mongoose").FlattenMaps<import("./schemas/submission.schema").SubmissionDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    upsertSubmission(dto: UpsertSubmissionDto): Promise<{
        isReplace: boolean;
    }>;
}
