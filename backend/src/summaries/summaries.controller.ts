import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { SummariesService } from './summaries.service';

@UseGuards(JwtAuthGuard)
@Controller('summaries')
export class SummariesController {
  constructor(private readonly summaries: SummariesService) {}

  @Get('recent')
  recent(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.summaries.listRecentForUser(
      user.id,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('repository/:repoId')
  perRepo(@CurrentUser() user: User, @Param('repoId') repoId: string) {
    return this.summaries.listForUserRepo(user.id, repoId);
  }

  @Get(':id')
  byId(@CurrentUser() user: User, @Param('id') id: string) {
    return this.summaries.findById(user.id, id);
  }
}
