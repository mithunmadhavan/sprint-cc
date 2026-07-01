import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SprintDocument = Sprint & Document;

@Schema({ collection: 'sprints' })
export class Sprint {
  @Prop({ required: true, trim: true, unique: true })
  sprint: string;

  @Prop({ required: true, min: 1 })
  pi: number;

  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SprintSchema = SchemaFactory.createForClass(Sprint);
SprintSchema.index({ sprint: 1, pi: 1 }, { unique: true });

