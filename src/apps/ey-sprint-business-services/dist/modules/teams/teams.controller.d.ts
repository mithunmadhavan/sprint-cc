import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
    listTeams(query: Record<string, string>): Promise<(import("mongoose").FlattenMaps<import("./schemas/team.schema").TeamDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getTeam(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/team.schema").TeamDocument, {}, {}> & import("./schemas/team.schema").Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createTeam(dto: CreateTeamDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/team.schema").TeamDocument, {}, {}> & import("./schemas/team.schema").Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateTeam(id: string, dto: UpdateTeamDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/team.schema").TeamDocument, {}, {}> & import("./schemas/team.schema").Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteTeam(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/team.schema").TeamDocument, {}, {}> & import("./schemas/team.schema").Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
