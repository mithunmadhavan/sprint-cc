import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
export declare class TeamsService {
    private readonly teamModel;
    constructor(teamModel: Model<TeamDocument>);
    ensureDefaultTeams(): Promise<void>;
    private normalizeKey;
    listTeams(filters?: Record<string, string>): Promise<(import("mongoose").FlattenMaps<TeamDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getTeam(id: string): Promise<import("mongoose").Document<unknown, {}, TeamDocument, {}, {}> & Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createTeam(dto: CreateTeamDto): Promise<import("mongoose").Document<unknown, {}, TeamDocument, {}, {}> & Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateTeam(id: string, dto: UpdateTeamDto): Promise<import("mongoose").Document<unknown, {}, TeamDocument, {}, {}> & Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteTeam(id: string): Promise<import("mongoose").Document<unknown, {}, TeamDocument, {}, {}> & Team & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
