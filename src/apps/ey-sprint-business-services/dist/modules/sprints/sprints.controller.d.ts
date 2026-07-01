import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
export declare class SprintsController {
    private readonly sprintsService;
    constructor(sprintsService: SprintsService);
    listSprints(query: Record<string, any>): Promise<any[]>;
    previewNextPi(pi?: string): Promise<{
        pi: number;
        sprints: {
            sprint: string;
            pi: number;
            start: Date;
            end: Date;
        }[];
    }>;
    listAddSprintOptions(): Promise<any[]>;
    createNextPi(body?: {
        pi?: number;
    }): Promise<import("mongoose").MergeType<import("mongoose").Document<unknown, {}, import("./schemas/sprint.schema").SprintDocument, {}, {}> & import("./schemas/sprint.schema").Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, Omit<{
        sprint: string;
        pi: number;
        start: Date;
        end: Date;
    }[], "_id">>[]>;
    createNewSprintInExistingPi(body: {
        pi: number;
    }): Promise<{
        pi: number;
        currentSprint: any;
        lastSprint: any;
        sprint: import("mongoose").Document<unknown, {}, import("./schemas/sprint.schema").SprintDocument, {}, {}> & import("./schemas/sprint.schema").Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        reflowedCount: number;
    }>;
    createSprint(dto: CreateSprintDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint.schema").SprintDocument, {}, {}> & import("./schemas/sprint.schema").Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getSprint(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint.schema").SprintDocument, {}, {}> & import("./schemas/sprint.schema").Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateSprint(id: string, dto: UpdateSprintDto): Promise<{
        sprint: import("mongoose").Document<unknown, {}, import("./schemas/sprint.schema").SprintDocument, {}, {}> & import("./schemas/sprint.schema").Sprint & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        reflowedCount: number;
        reflowedSprints: any[];
    }>;
    deletePi(piNumber: string): Promise<{
        pi: number;
        deleted: number;
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
}
