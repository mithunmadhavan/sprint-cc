import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ _id: false })
class RosterMember {
  @Prop({ default: '' }) name: string;
  @Prop({ default: '' }) role: string;
  @Prop({ default: 0 }) ph: number;
  @Prop({ default: 0 }) al: number;
  @Prop({ default: 0 }) other: number;
  @Prop({ default: 0 }) pct: number;
  @Prop({ default: '' }) notes: string;
  @Prop({ default: 0 }) AvailableDays: number;
}

const RosterMemberSchema = SchemaFactory.createForClass(RosterMember);

@Schema({ timestamps: true })
export class Submission {
  @Prop({ required: true }) Team: string;
  @Prop({ required: true }) ProjectKey: string;
  @Prop({ required: true }) SprintNo: string;
  @Prop({ default: '' }) PI: string;
  @Prop({ default: '' }) SprintStart: string;
  @Prop({ default: '' }) SprintEnd: string;
  @Prop({ default: '' }) submittedDate: string;
  @Prop({ default: '' }) submittedBy: string;
  @Prop({ default: 'normal' }) submittedRole: string;
  @Prop({ default: 0 }) TeamSize: number;
  @Prop({ default: 0 }) TotalDays: number;
  @Prop({ default: 0 }) SprintOverhead: number;
  @Prop({ default: 0, min: 0, max: 100 }) ProductHealth: number;
  @Prop({ default: 0, min: 0 }) ProductHealthReduction: number;
  @Prop({ default: 0 }) SprintCapacity: number;
  @Prop({ default: 0 }) DevCapacityDays: number;
  @Prop({ default: 0 }) TestCapacityDays: number;
  @Prop({ default: 0 }) DevPercent: number;
  @Prop({ default: 0 }) TestPercent: number;
  @Prop({ type: Number, default: null, min: 0 }) SprintGoal: number | null;
  @Prop({ type: Number, default: null, min: 0 }) GoalsAchieved: number | null;
  @Prop({ type: [String], default: [] }) Objectives: string[];
  @Prop({ default: '' }) Notes: string;
  @Prop({ type: [RosterMemberSchema], default: [] }) Roster: RosterMember[];
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
SubmissionSchema.index({ ProjectKey: 1, SprintNo: 1 }, { unique: true });
