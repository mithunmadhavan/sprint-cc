import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, USER_ROLES } from './schemas/user.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    private readonly authService: AuthService,
  ) {}

  private toSafeUser(user: any) {
    return {
      id: String(user._id),
      username: user.username,
      name: user.name,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      assignedTeams: Array.isArray(user.assignedTeams) ? user.assignedTeams : [],
      okta_id: user.okta_id ?? '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeRole(value: string): string {
    const role = String(value ?? '').trim();
    if (!Object.values(USER_ROLES).includes(role as any)) {
      throw new BadRequestException(
        `role must be one of: ${Object.values(USER_ROLES).join(', ')}`,
      );
    }
    return role;
  }

  private normalizeStatus(value?: string): string {
    const status = String(value ?? '').trim().toLowerCase();
    if (!status) return '';
    if (!['active', 'inactive'].includes(status)) {
      throw new BadRequestException("status must be 'active' or 'inactive'");
    }
    return status;
  }

  private async normalizeAssignedTeams(assignedTeams: string[], role: string) {
    if (role !== USER_ROLES.EDITOR) {
      return [];
    }

    const requested = [
      ...new Set(
        (Array.isArray(assignedTeams) ? assignedTeams : [])
          .map((team) => String(team ?? '').trim().toUpperCase())
          .filter(Boolean),
      ),
    ];

    if (requested.length === 0) {
      return [];
    }

    const existingTeams = await this.teamModel
      .find({ key: { $in: requested } }, { key: 1 })
      .lean();
    const existingKeys = new Set(existingTeams.map((team: any) => team.key));
    const invalid = requested.filter((key) => !existingKeys.has(key));
    if (invalid.length) {
      throw new BadRequestException(`Unknown team key(s): ${invalid.join(', ')}`);
    }

    return requested;
  }

  async listUsers(filters: Record<string, string> = {}) {
    await this.authService.ensureDefaultAdminUser();

    const query: Record<string, any> = {};
    const search = String(filters.search ?? '').trim();
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (filters.role) {
      query.role = this.normalizeRole(filters.role);
    }

    const status = this.normalizeStatus(filters.status);
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await this.userModel.find(query).sort({ email: 1 }).lean();
    return users.map((user) => this.toSafeUser(user));
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.authService.ensureDefaultAdminUser();

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextRole =
      dto.role !== undefined ? this.normalizeRole(dto.role) : user.role;
    const nextIsActive =
      dto.isActive !== undefined ? Boolean(dto.isActive) : user.isActive !== false;
    const nextAssignedTeams = await this.normalizeAssignedTeams(
      dto.assignedTeams !== undefined ? dto.assignedTeams : user.assignedTeams,
      nextRole,
    );

    user.role = nextRole as any;
    user.isActive = nextIsActive;
    user.assignedTeams = nextAssignedTeams;
    await user.save();

    return this.toSafeUser(user);
  }
}

