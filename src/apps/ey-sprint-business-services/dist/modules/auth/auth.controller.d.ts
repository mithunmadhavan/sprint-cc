import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signIn(dto: SignInDto): Promise<{
        ok: boolean;
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
    getProfile(user: any): Promise<{
        ok: boolean;
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
        } | null;
    }>;
}
