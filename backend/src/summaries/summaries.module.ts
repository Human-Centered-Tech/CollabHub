import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PullRequest } from './pull-request.entity';
import { Summary } from './summary.entity';
import { SummariesService } from './summaries.service';
import { SummariesController } from './summaries.controller';
import { GithubModule } from '../github/github.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PullRequest, Summary]),
    GithubModule,
    LlmModule,
  ],
  providers: [SummariesService],
  controllers: [SummariesController],
  exports: [SummariesService],
})
export class SummariesModule {}
