import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users/schemas/user.schema';
export declare class AuthService {
    private readonly userModel;
    private readonly jwtService;
    private readonly config;
    private readonly etihadDomain;
    private readonly adminEmail;
    private readonly adminPassword;
    constructor(userModel: Model<UserDocument>, jwtService: JwtService, config: ConfigService);
    private normalizeEmail;
    private usernameFromEmail;
    private assertEtihadEmail;
    private buildToken;
    userToSafe(user: UserDocument): {
        id: string;
        username: string;
        name: string;
        firstName: string;
        lastName: string;
        email: string;
        role: import("../users/schemas/user.schema").UserRole;
        isActive: boolean;
        assignedTeams: string[];
        okta_id: string;
    };
    ensureDefaultAdminUser(): Promise<UserDocument>;
    signIn(dto: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            name: string;
            firstName: string;
            lastName: string;
            email: string;
            role: import("../users/schemas/user.schema").UserRole;
            isActive: boolean;
            assignedTeams: string[];
            okta_id: string;
        };
    }>;
    getUserById(id: string): Promise<{
        id: string;
        username: string;
        name: string;
        firstName: string;
        lastName: string;
        email: string;
        role: import("../users/schemas/user.schema").UserRole;
        isActive: boolean;
        assignedTeams: string[];
        okta_id: string;
    } | null>;
}
