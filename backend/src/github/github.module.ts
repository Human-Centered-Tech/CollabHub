import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Installation } from './installation.entity';
import { Repository } from './repository.entity';
import { GithubAppConfig } from './app-config.entity';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { AppConfigService } from './app-config.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Installation, Repository, GithubAppConfig]),
    AuthModule,
  ],
  providers: [GithubService, AppConfigService],
  controllers: [GithubController],
  exports: [GithubService, AppConfigService],
})
export class GithubModule {}
