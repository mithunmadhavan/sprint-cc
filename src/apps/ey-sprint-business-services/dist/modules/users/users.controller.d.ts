import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    listUsers(query: Record<string, string>): Promise<{
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
