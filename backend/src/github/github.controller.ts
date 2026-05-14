import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { GithubService } from './github.service';
import { User } from '../users/user.entity';

class LinkInstallationDto {
  @IsString()
  installationId: string;

  @IsString()
  state: string;
}

class SetEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('github')
export class GithubController {
  constructor(
    private readonly github: GithubService,
    private readonly auth: AuthService,
  ) {}

  @Get('install-url')
  installUrl(@CurrentUser() user: User) {
    const state = this.auth.signGithubState(user.id);
    return { url: this.github.installUrl(state), state };
  }

  @Post('installations/link')
  async link(@CurrentUser() user: User, @Body() dto: LinkInstallationDto) {
    const userIdFromState = this.auth.verifyGithubState(dto.state);
    if (userIdFromState !== user.id) {
      return { ok: false, error: 'state-user-mismatch' };
    }
    const installation = await this.github.linkInstallation(
      user.id,
      dto.installationId,
    );
    return { ok: true, installation };
  }

  @Get('installations')
  installations(@CurrentUser() user: User) {
    return this.github.listUserInstallations(user.id);
  }

  @Get('repositories')
  repositories(@CurrentUser() user: User) {
    return this.github.listUserRepositories(user.id);
  }

  @Patch('repositories/:id')
  setEnabled(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SetEnabledDto,
  ) {
    return this.github.setRepositoryEnabled(user.id, id, dto.enabled);
  }
}
