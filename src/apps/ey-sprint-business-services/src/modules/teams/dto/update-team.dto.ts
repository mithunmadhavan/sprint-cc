import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]+$/i, {
    message: 'Team key must contain only letters and numbers',
  })
  key?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

