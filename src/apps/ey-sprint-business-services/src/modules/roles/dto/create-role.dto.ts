import { IsString, IsBoolean, IsOptional, IsIn, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(['team', 'non-team'])
  roleType?: string;

  @IsOptional()
  @IsBoolean()
  isCapacity?: boolean;
}

