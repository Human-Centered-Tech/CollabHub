import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../users/user.entity';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    // Shared-instance mode: registration is closed by default so an
    // unauthenticated visitor can't grant themselves access to every repo.
    // Flip REGISTRATION_ENABLED=true on the backend service to re-open it
    // (e.g. to add a new teammate), then flip it back off.
    if (this.config.get<string>('REGISTRATION_ENABLED') !== 'true') {
      throw new ForbiddenException('Registration is disabled');
    }
    return this.auth.register(dto.email, dto.name, dto.password);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, name: user.name };
  }
}
