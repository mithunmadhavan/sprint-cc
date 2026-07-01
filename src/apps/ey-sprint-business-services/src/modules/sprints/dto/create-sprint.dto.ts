import { IsString, IsNumber, IsDateString, Min, MinLength } from 'class-validator';

export class CreateSprintDto {
  @IsString()
  @MinLength(1)
  sprint: string;

  @IsNumber()
  @Min(1)
  pi: number;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

