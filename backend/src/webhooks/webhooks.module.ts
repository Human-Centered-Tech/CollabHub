import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { GithubModule } from '../github/github.module';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
  imports: [GithubModule, SummariesModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
