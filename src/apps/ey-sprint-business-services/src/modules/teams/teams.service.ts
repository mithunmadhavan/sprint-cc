import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

const DEFAULT_TEAMS = [
  { name: 'McLaren', key: 'MC', isActive: true },
  { name: 'Cadillac', key: 'CAD', isActive: true },
  { name: 'BMW', key: 'BMW', isActive: true },
  { name: 'Aston Martin', key: 'AS', isActive: true },
  { name: 'Haas', key: 'HAAS', isActive: true },
  { name: 'Mercedes', key: 'DMA', isActive: true },
  { name: 'Kick Sauber', key: 'SAUB', isActive: true },
  { name: 'Williams', key: 'WIL', isActive: true },
  { name: 'Audi', key: 'AUDI', isActive: true },
  { name: 'Ferrari', key: 'FER', isActive: true },
  { name: 'Renault', key: 'REN', isActive: true },
];

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
  ) {}

  async ensureDefaultTeams() {
    const count = await this.teamModel.countDocuments();
    if (!count) {
      await this.teamModel.insertMany(DEFAULT_TEAMS, { ordered: true });
    }
  }

  private normalizeKey(value: string, required = true) {
    const key = String(value ?? '').trim().toUpperCase();
    if (required && !key) {
      throw new BadRequestException('Team key is required');
    }
    if (key && !/^[A-Z0-9]+$/.test(key)) {
      throw new BadRequestException('Team key must contain only letters and numbers');
    }
    return key;
  }

  async listTeams(filters: Record<string, string> = {}) {
    await this.ensureDefaultTeams();

    const query: Record<string, any> = {};
    if (filters.name) {
      query.name = { $regex: String(filters.name).trim(), $options: 'i' };
    }
    if (filters.key) {
      query.key = {
        $regex: String(filters.key).trim().toUpperCase(),
        $options: 'i',
      };
    }
    if (filters.status === 'active') query.isActive = true;
    if (filters.status === 'inactive') query.isActive = false;

    const teams = await this.teamModel.find(query).lean();
    return teams.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  async getTeam(id: string) {
    await this.ensureDefaultTeams();
    const team = await this.teamModel.findById(id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async createTeam(dto: CreateTeamDto) {
    await this.ensureDefaultTeams();
    const team = new this.teamModel({
      name: String(dto.name).trim(),
      key: this.normalizeKey(dto.key),
      isActive: dto.isActive !== false,
    });
    return team.save();
  }

  async updateTeam(id: string, dto: UpdateTeamDto) {
    await this.ensureDefaultTeams();
    const team = await this.teamModel.findById(id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (dto.name !== undefined) team.name = String(dto.name).trim();
    if (dto.key !== undefined) team.key = this.normalizeKey(dto.key) as any;
    if (dto.isActive !== undefined) team.isActive = Boolean(dto.isActive);

    return team.save();
  }

  async deleteTeam(id: string) {
    await this.ensureDefaultTeams();
    const result = await this.teamModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Team not found');
    }
    return result;
  }
}

