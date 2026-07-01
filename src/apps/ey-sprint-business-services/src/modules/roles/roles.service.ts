import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SprintRole, SprintRoleDocument } from './schemas/sprint-role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const DEFAULT_ROLES = [
  { name: 'Full Stack Dev', roleType: 'team', isCapacity: true },
  { name: 'Front End Dev', roleType: 'team', isCapacity: true },
  { name: 'Back End Dev', roleType: 'team', isCapacity: true },
  { name: 'Tester', roleType: 'team', isCapacity: true },
  { name: 'Architect', roleType: 'non-team', isCapacity: false },
  { name: 'Scrum Master', roleType: 'non-team', isCapacity: false },
  { name: 'Product Owner', roleType: 'non-team', isCapacity: false },
];

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(SprintRole.name)
    private readonly roleModel: Model<SprintRoleDocument>,
  ) {}

  private normalizeRoleType(value: string) {
    const roleType = String(value ?? 'team').trim().toLowerCase();
    if (!['team', 'non-team'].includes(roleType)) {
      throw new BadRequestException("roleType must be 'team' or 'non-team'");
    }
    return roleType;
  }

  async ensureDefaultRoles() {
    const count = await this.roleModel.countDocuments();
    if (!count) {
      await this.roleModel.insertMany(DEFAULT_ROLES, { ordered: true });
    }
  }

  async listRoles(filters: Record<string, string> = {}) {
    await this.ensureDefaultRoles();

    const query: Record<string, any> = {};
    if (filters.name) {
      query.name = { $regex: String(filters.name).trim(), $options: 'i' };
    }
    if (filters.roleType) {
      query.roleType = this.normalizeRoleType(filters.roleType);
    }
    if (filters.capacityFilter === 'included') query.isCapacity = true;
    if (filters.capacityFilter === 'excluded') query.isCapacity = false;

    const roles = await this.roleModel.find(query).lean();
    return roles.sort((a: any, b: any) => {
      if (a.roleType !== b.roleType) {
        return a.roleType === 'team' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async getRole(id: string) {
    await this.ensureDefaultRoles();
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    await this.ensureDefaultRoles();
    const roleType = this.normalizeRoleType(dto.roleType ?? 'team');
    const isCapacity = roleType === 'team' ? true : Boolean(dto.isCapacity);
    const role = new this.roleModel({
      name: String(dto.name).trim(),
      roleType,
      isCapacity,
    });
    return role.save();
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.ensureDefaultRoles();
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const roleType = this.normalizeRoleType(dto.roleType ?? role.roleType);
    role.roleType = roleType as any;
    role.isCapacity =
      roleType === 'team'
        ? true
        : dto.isCapacity !== undefined
          ? Boolean(dto.isCapacity)
          : role.isCapacity;

    if (dto.name !== undefined) {
      const name = String(dto.name).trim();
      if (!name) {
        throw new BadRequestException('Role name is required');
      }
      role.name = name;
    }

    return role.save();
  }

  async deleteRole(id: string) {
    await this.ensureDefaultRoles();
    const role = await this.roleModel.findByIdAndDelete(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }
}

