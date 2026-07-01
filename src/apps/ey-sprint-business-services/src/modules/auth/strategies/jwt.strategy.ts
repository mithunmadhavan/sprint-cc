import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  assignedTeams: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtSecret', 'change-this-in-production'),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      assignedTeams: payload.assignedTeams ?? [],
    };
  }
}

