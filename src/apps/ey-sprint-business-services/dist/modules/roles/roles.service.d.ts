import { Model } from 'mongoose';
import { SprintRole, SprintRoleDocument } from './schemas/sprint-role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private readonly roleModel;
    constructor(roleModel: Model<SprintRoleDocument>);
    private normalizeRoleType;
    ensureDefaultRoles(): Promise<void>;
    listRoles(filters?: Record<string, string>): Promise<(import("mongoose").FlattenMaps<SprintRoleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getRole(id: string): Promise<import("mongoose").Document<unknown, {}, SprintRoleDocument, {}, {}> & SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createRole(dto: CreateRoleDto): Promise<import("mongoose").Document<unknown, {}, SprintRoleDocument, {}, {}> & SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<import("mongoose").Document<unknown, {}, SprintRoleDocument, {}, {}> & SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteRole(id: string): Promise<import("mongoose").Document<unknown, {}, SprintRoleDocument, {}, {}> & SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
