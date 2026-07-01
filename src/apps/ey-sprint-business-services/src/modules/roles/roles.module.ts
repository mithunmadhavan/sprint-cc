import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { SprintRole, SprintRoleSchema } from './schemas/sprint-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SprintRole.name, schema: SprintRoleSchema },
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}

