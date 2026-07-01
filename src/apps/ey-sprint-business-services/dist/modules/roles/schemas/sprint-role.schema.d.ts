import { Document } from 'mongoose';
export type SprintRoleDocument = SprintRole & Document;
export declare class SprintRole {
    name: string;
    roleType: string;
    isCapacity: boolean;
}
export declare const SprintRoleSchema: import("mongoose").Schema<SprintRole, import("mongoose").Model<SprintRole, any, any, any, Document<unknown, any, SprintRole, any, {}> & SprintRole & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SprintRole, Document<unknown, {}, import("mongoose").FlatRecord<SprintRole>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SprintRole> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
