import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Installation } from './installation.entity';
import { Repository } from './repository.entity';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Installation, Repository]), AuthModule],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule {}
