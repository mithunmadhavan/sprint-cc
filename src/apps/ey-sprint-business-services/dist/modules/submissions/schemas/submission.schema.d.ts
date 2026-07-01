import { Document } from 'mongoose';
export type SubmissionDocument = Submission & Document;
declare class RosterMember {
    name: string;
    role: string;
    ph: number;
    al: number;
    other: number;
    pct: number;
    notes: string;
    AvailableDays: number;
}
export declare class Submission {
    Team: string;
    ProjectKey: string;
    SprintNo: string;
    PI: string;
    SprintStart: string;
    SprintEnd: string;
    submittedDate: string;
    submittedBy: string;
    submittedRole: string;
    TeamSize: number;
    TotalDays: number;
    SprintOverhead: number;
    ProductHealth: number;
    ProductHealthReduction: number;
    SprintCapacity: number;
    DevCapacityDays: number;
    TestCapacityDays: number;
    DevPercent: number;
    TestPercent: number;
    SprintGoal: number | null;
    GoalsAchieved: number | null;
    Objectives: string[];
    Notes: string;
    Roster: RosterMember[];
}
export declare const SubmissionSchema: import("mongoose").Schema<Submission, import("mongoose").Model<Submission, any, any, any, Document<unknown, any, Submission, any, {}> & Submission & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Submission, Document<unknown, {}, import("mongoose").FlatRecord<Submission>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Submission> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export {};
