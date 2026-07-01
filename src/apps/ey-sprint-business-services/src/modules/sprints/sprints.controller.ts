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
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { USER_ROLES } from '../users/schemas/user.schema';

@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  listSprints(@Query() query: Record<string, any>) {
    return this.sprintsService.listSprints(query);
  }

  @Get('next-pi-preview')
  previewNextPi(@Query('pi') pi?: string) {
    return this.sprintsService.previewNextPiBatch(pi);
  }

  @Get('add-sprint-options')
  listAddSprintOptions() {
    return this.sprintsService.listAddSprintOptions();
  }

  @Post('create-next-pi')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  createNextPi(@Body() body?: { pi?: number }) {
    return this.sprintsService.createNextPiBatch(body?.pi);
  }

  @Post('create-new-sprint')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  createNewSprintInExistingPi(@Body() body: { pi: number }) {
    return this.sprintsService.createNewSprintInExistingPi(body.pi);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  createSprint(@Body() dto: CreateSprintDto) {
    return this.sprintsService.createSprint(dto);
  }

  @Get(':id')
  getSprint(@Param('id') id: string) {
    return this.sprintsService.getSprint(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  updateSprint(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.sprintsService.updateSprint(id, dto);
  }

  @Delete('pi/:piNumber')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  deletePi(@Param('piNumber') piNumber: string) {
    return this.sprintsService.deletePiBatch(piNumber);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteSprint(@Param('id') id: string) {
    return this.sprintsService.deleteSprint(id);
  }
}
