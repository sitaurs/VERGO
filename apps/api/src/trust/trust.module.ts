import { Module } from '@nestjs/common';
import { ExtensionsModule } from '../extensions/extensions.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { AdminGuard } from '../admin/admin.guard.js';
import { SessionRepository } from '../session/session.repository.js';
import { TrustService } from './trust.service.js';
import { TrustAdminController, TrustAppealsController, TrustPublicController, TrustReportsController } from './trust.controller.js';

@Module({imports:[ExtensionsModule],providers:[TrustService,SessionAuthGuard,SessionRepository,AdminGuard],controllers:[TrustPublicController,TrustReportsController,TrustAppealsController,TrustAdminController]})
export class TrustModule {}
