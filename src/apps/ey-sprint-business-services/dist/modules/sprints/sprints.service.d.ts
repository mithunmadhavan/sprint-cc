import { Model } from 'mongoose';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { Sprint, SprintDocument } from './schemas/sprint.schema';
import { SubmissionDocument } from '../submissions/schemas/submission.schema';
export declare class SprintsService {
    private readonly sprintModel;
    private readonly submissionModel;
    constructor(sprintModel: Model<SprintDocument>, submissionModel: Model<SubmissionDocument>);
    private toPiNumber;
    private assertValidDateRange;
    private getLastSprintInPi;
    private getPreviousSprintInPi;
    private getPiStartSprint;
    private resolveNextAvailableSprintName;
    private reflowTrailingSprints;
    private reflowScheduledSprintsAfter;
    listSprints(filters?: Record<string, any>): Promise<any[]>;
    getSprint(id: string): Promise<import("mongoose").Document<unknown, {}, SprintDocument, {}, {}> & Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createSprint(data: CreateSprintDto): Promise<import("mongoose").Document<unknown, {}, SprintDocument, {}, {}> & Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateSprint(id: string, data: UpdateSprintDto): Promise<{
        sprint: import("mongoose").Document<unknown, {}, SprintDocument, {}, {}> & Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        reflowedCount: number;
        reflowedSprints: any[];
    }>;
    deleteSprint(id: string): Promise<{
        submissionsDeleted: number;
        sprint: string;
        pi: number;
        start: Date;
        end: Date;
        createdAt: Date;
        updatedAt: Date;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
    }>;
    listAddSprintOptions(): Promise<any[]>;
    createNewSprintInExistingPi(piNumber: number): Promise<{
        pi: number;
        currentSprint: any;
        lastSprint: any;
        sprint: import("mongoose").Document<unknown, {}, SprintDocument, {}, {}> & Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        reflowedCount: number;
    }>;
    private getNotStartedPiNumbers;
    private buildPiBatch;
    private computeNextPiBatch;
    previewNextPiBatch(initialPiInput?: unknown): Promise<{
        pi: number;
        sprints: {
            sprint: string;
            pi: number;
            start: Date;
            end: Date;
        }[];
    }>;
    createNextPiBatch(initialPiInput?: unknown): Promise<import("mongoose").MergeType<import("mongoose").Document<unknown, {}, SprintDocument, {}, {}> & Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, Omit<{
        sprint: string;
        pi: number;
        start: Date;
        end: Date;
    }[], "_id">>[]>;
    deletePiBatch(piNumber: string): Promise<{
        pi: number;
        deleted: number;
    }>;
}
