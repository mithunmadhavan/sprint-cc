import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  sprint?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pi?: number;

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

