import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    listRoles(query: Record<string, string>): Promise<(import("mongoose").FlattenMaps<import("./schemas/sprint-role.schema").SprintRoleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getRole(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint-role.schema").SprintRoleDocument, {}, {}> & import("./schemas/sprint-role.schema").SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createRole(dto: CreateRoleDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint-role.schema").SprintRoleDocument, {}, {}> & import("./schemas/sprint-role.schema").SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint-role.schema").SprintRoleDocument, {}, {}> & import("./schemas/sprint-role.schema").SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteRole(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/sprint-role.schema").SprintRoleDocument, {}, {}> & import("./schemas/sprint-role.schema").SprintRole & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
