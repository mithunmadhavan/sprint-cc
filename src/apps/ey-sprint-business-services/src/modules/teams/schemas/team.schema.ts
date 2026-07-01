import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true, collection: 'teams' })
export class Team {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, uppercase: true })
  key: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
TeamSchema.index({ name: 1 }, { unique: true });
TeamSchema.index({ key: 1 }, { unique: true });

