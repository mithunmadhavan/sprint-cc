import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { USER_ROLES } from '../users/schemas/user.schema';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  listTeams(@Query() query: Record<string, string>) {
    return this.teamsService.listTeams(query);
  }

  @Get(':id')
  getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  createTeam(@Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  updateTeam(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.updateTeam(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteTeam(@Param('id') id: string) {
    return this.teamsService.deleteTeam(id);
  }
}

