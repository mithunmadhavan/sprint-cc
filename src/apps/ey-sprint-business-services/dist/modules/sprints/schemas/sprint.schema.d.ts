import { Document } from 'mongoose';
export type SprintDocument = Sprint & Document;
export declare class Sprint {
    sprint: string;
    pi: number;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SprintSchema: import("mongoose").Schema<Sprint, import("mongoose").Model<Sprint, any, any, any, Document<unknown, any, Sprint, any, {}> & Sprint & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Sprint, Document<unknown, {}, import("mongoose").FlatRecord<Sprint>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Sprint> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
