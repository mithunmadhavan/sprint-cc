import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['team', 'non-team'])
  roleType?: string;

  @IsOptional()
  @IsBoolean()
  isCapacity?: boolean;
}

