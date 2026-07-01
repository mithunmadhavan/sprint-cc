import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsIn,
} from 'class-validator';
import { USER_ROLES } from '../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(USER_ROLES))
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTeams?: string[];
}

