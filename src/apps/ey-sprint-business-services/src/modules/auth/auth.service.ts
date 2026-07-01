import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, USER_ROLES } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private readonly etihadDomain: string;
  private readonly adminEmail: string;
  private readonly adminPassword: string;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.etihadDomain = config.get<string>('app.etihadDomain', 'etihad.ae');
    this.adminEmail = config.get<string>(
      'app.adminBootstrapEmail',
      'mithunpramilak@etihad.ae',
    );
    this.adminPassword = config.get<string>(
      'app.adminBootstrapPassword',
      'Admin@1234',
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private normalizeEmail(email: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private usernameFromEmail(email: string): string {
    return this.normalizeEmail(email).split('@')[0] || 'viewer';
  }

  private assertEtihadEmail(email: string): string {
    const normalized = this.normalizeEmail(email);
    if (!normalized.endsWith(`@${this.etihadDomain}`)) {
      throw new ForbiddenException(
        `Only @${this.etihadDomain} email addresses are allowed`,
      );
    }
    return normalized;
  }

  private buildToken(user: UserDocument): string {
    const payload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      assignedTeams: Array.isArray(user.assignedTeams)
        ? user.assignedTeams
        : [],
    };
    return this.jwtService.sign(payload);
  }

  userToSafe(user: UserDocument) {
    return {
      id: String(user._id),
      username: user.username,
      name: user.name,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      assignedTeams: Array.isArray(user.assignedTeams)
        ? user.assignedTeams
        : [],
      okta_id: user.okta_id ?? '',
    };
  }

  // ── bootstrap ──────────────────────────────────────────────────────────────

  async ensureDefaultAdminUser(): Promise<UserDocument> {
    const email = this.adminEmail;
    const username = this.usernameFromEmail(email);
    const existing = await this.userModel.findOne({ email });

    if (existing) {
      const needsUpdate =
        existing.role !== USER_ROLES.ADMIN ||
        !existing.isActive ||
        existing.username !== username;

      if (needsUpdate) {
        existing.role = USER_ROLES.ADMIN;
        existing.isActive = true;
        existing.username = username;
        existing.name = username;
        existing.firstName = '';
        existing.lastName = '';
        await existing.save();
      }
      return existing;
    }

    const passwordHash = await bcrypt.hash(this.adminPassword, 10);
    return this.userModel.create({
      username,
      name: username,
      firstName: '',
      lastName: '',
      email,
      password: passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
      assignedTeams: [],
      okta_id: '',
    });
  }

  // ── public API ─────────────────────────────────────────────────────────────

  async signIn(dto: { email: string; password: string; name?: string }) {
    const normalizedEmail = this.assertEtihadEmail(dto.email);
    const providedPassword = String(dto.password ?? '').trim();

    if (!providedPassword) {
      throw new BadRequestException('Password is required');
    }

    await this.ensureDefaultAdminUser();

    let user = await this.userModel.findOne({ email: normalizedEmail });

    if (!user) {
      const username = this.usernameFromEmail(normalizedEmail);
      const passwordHash = await bcrypt.hash(providedPassword, 10);
      user = await this.userModel.create({
        username,
        name: username,
        firstName: '',
        lastName: '',
        email: normalizedEmail,
        password: passwordHash,
        role: USER_ROLES.VIEWER,
        isActive: true,
        assignedTeams: [],
        okta_id: '',
      });
    } else {
      const isValid = await bcrypt.compare(providedPassword, user.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const expectedUsername = this.usernameFromEmail(normalizedEmail);
      if (user.username !== expectedUsername || user.name !== expectedUsername) {
        user.username = expectedUsername;
        user.name = expectedUsername;
        user.firstName = '';
        user.lastName = '';
        await user.save();
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is disabled');
    }

    return {
      token: this.buildToken(user),
      user: this.userToSafe(user),
    };
  }

  async getUserById(id: string) {
    if (!id) return null;
    const user = await this.userModel.findById(id).lean();
    return user ? this.userToSafe(user as any) : null;
  }
}
