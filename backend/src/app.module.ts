import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GithubModule } from './github/github.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SummariesModule } from './summaries/summaries.module';
import { LlmModule } from './llm/llm.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: true, // OK for v0; switch to migrations later
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    AuthModule,
    UsersModule,
    GithubModule,
    WebhooksModule,
    SummariesModule,
    LlmModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
