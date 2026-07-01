import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/signin */
  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    const result = await this.authService.signIn(dto);
    return { ok: true, token: result.token, user: result.user };
  }

  /** GET /api/auth/me */
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getUserById(user.id);
    return { ok: true, user: profile };
  }
}

