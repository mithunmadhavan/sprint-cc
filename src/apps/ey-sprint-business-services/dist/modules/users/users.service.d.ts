import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { TeamDocument } from '../teams/schemas/team.schema';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly userModel;
    private readonly teamModel;
    private readonly authService;
    constructor(userModel: Model<UserDocument>, teamModel: Model<TeamDocument>, authService: AuthService);
    private toSafeUser;
    private normalizeRole;
    private normalizeStatus;
    private normalizeAssignedTeams;
    listUsers(filters?: Record<string, string>): Promise<{
        id: string;
        username: any;
        name: any;
        firstName: any;
        lastName: any;
        email: any;
        role: any;
        isActive: boolean;
        assignedTeams: any;
        okta_id: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        username: any;
        name: any;
        firstName: any;
        lastName: any;
        email: any;
        role: any;
        isActive: boolean;
        assignedTeams: any;
        okta_id: any;
        createdAt: any;
        updatedAt: any;
    }>;
}
