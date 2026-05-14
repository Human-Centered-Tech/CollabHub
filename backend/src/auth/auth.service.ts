import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<AuthResult> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({ email, name, passwordHash });
    return this.makeResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.makeResult(user);
  }

  signGithubState(userId: string): string {
    return this.jwt.sign(
      { sub: userId, purpose: 'github-install' },
      { expiresIn: '15m' },
    );
  }

  verifyGithubState(token: string): string {
    const payload = this.jwt.verify<{ sub: string; purpose: string }>(token);
    if (payload.purpose !== 'github-install') {
      throw new UnauthorizedException('Invalid install state');
    }
    return payload.sub;
  }

  private makeResult(user: User): AuthResult {
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
