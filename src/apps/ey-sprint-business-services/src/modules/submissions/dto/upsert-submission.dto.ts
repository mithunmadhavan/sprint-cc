import { IsString, IsNumber, IsArray, IsOptional, Min, Max, MinLength } from 'class-validator';

export class RosterMemberDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsNumber() ph?: number;
  @IsOptional() @IsNumber() al?: number;
  @IsOptional() @IsNumber() other?: number;
  @IsOptional() @IsNumber() pct?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() AvailableDays?: number;
}

export class UpsertSubmissionDto {
  @IsString() @MinLength(1) Team: string;
  @IsString() @MinLength(1) ProjectKey: string;
  @IsString() @MinLength(1) SprintNo: string;

  @IsOptional() @IsString() PI?: string;
  @IsOptional() @IsString() SprintStart?: string;
  @IsOptional() @IsString() SprintEnd?: string;
  @IsOptional() @IsString() submittedDate?: string;
  @IsOptional() @IsString() submittedBy?: string;
  @IsOptional() @IsString() submittedRole?: string;
  @IsOptional() @IsNumber() TeamSize?: number;
  @IsOptional() @IsNumber() TotalDays?: number;
  @IsOptional() @IsNumber() SprintOverhead?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) ProductHealth?: number;
  @IsOptional() @IsNumber() @Min(0) ProductHealthReduction?: number;
  @IsOptional() @IsNumber() SprintCapacity?: number;
  @IsOptional() @IsNumber() DevCapacityDays?: number;
  @IsOptional() @IsNumber() TestCapacityDays?: number;
  @IsOptional() @IsNumber() DevPercent?: number;
  @IsOptional() @IsNumber() TestPercent?: number;
  @IsOptional() @IsNumber() @Min(0) SprintGoal?: number;
  @IsOptional() @IsNumber() @Min(0) GoalsAchieved?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) Objectives?: string[];
  @IsOptional() @IsString() Objective?: string;
  @IsOptional() @IsString() Notes?: string;
  @IsOptional() @IsArray() Roster?: RosterMemberDto[];
}

