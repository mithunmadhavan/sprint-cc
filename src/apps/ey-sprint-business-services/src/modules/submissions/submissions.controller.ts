import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { UpsertSubmissionDto } from './dto/upsert-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubmissionWriteGuard } from '../../common/guards/submission-write.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { USER_ROLES } from '../users/schemas/user.schema';

@Controller()
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.submissionsService.getHealth();
  }

  @Get('submissions')
  listSubmissions(@Query() query: Record<string, any>) {
    return this.submissionsService.listSubmissions(query);
  }

  @Get('submissions/:teamKey/:sprintNo')
  getSubmission(
    @Param('teamKey') teamKey: string,
    @Param('sprintNo') sprintNo: string,
  ) {
    return this.submissionsService.getSubmission(teamKey, sprintNo);
  }

  @Post('submissions/upsert')
  @UseGuards(RolesGuard, SubmissionWriteGuard)
  @Roles(USER_ROLES.ADMIN, USER_ROLES.EDITOR)
  upsertSubmission(@Body() dto: UpsertSubmissionDto) {
    return this.submissionsService.upsertSubmission(dto);
  }
}

