import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';
import { Sprint, SprintSchema } from './schemas/sprint.schema';
import { Submission, SubmissionSchema } from '../submissions/schemas/submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sprint.name, schema: SprintSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
  ],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
