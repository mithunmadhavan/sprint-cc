import { IsString, IsBoolean, IsOptional, Matches, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Matches(/^[A-Z0-9]+$/i, {
    message: 'Team key must contain only letters and numbers',
  })
  key: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

