import { Document } from 'mongoose';
export declare const USER_ROLES: {
    readonly ADMIN: "Admin";
    readonly EDITOR: "Editor";
    readonly VIEWER: "Viewer";
};
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type UserDocument = User & Document;
export declare class User {
    username: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isActive: boolean;
    role: UserRole;
    assignedTeams: string[];
    okta_id: string;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
