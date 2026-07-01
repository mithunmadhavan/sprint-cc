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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { USER_ROLES } from '../users/schemas/user.schema';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  listRoles(@Query() query: Record<string, string>) {
    return this.rolesService.listRoles(query);
  }

  @Get(':id')
  getRole(@Param('id') id: string) {
    return this.rolesService.getRole(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }
}

