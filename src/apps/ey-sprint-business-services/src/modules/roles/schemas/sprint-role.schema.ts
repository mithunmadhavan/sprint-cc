import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SprintRoleDocument = SprintRole & Document;

@Schema({ timestamps: true, collection: 'sprint_roles' })
export class SprintRole {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    type: String,
    enum: ['team', 'non-team'],
    default: 'team',
  })
  roleType: string;

  @Prop({ default: true })
  isCapacity: boolean;
}

export const SprintRoleSchema = SchemaFactory.createForClass(SprintRole);
SprintRoleSchema.index({ name: 1 }, { unique: true });

