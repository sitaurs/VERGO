import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { AdminGuard } from '../admin/admin.guard.js';
import { ExtensionNoStoreInterceptor } from '../activities/activities.controller.js';
import { revision } from '../extensions/input.js';
import type { Actor } from '../extensions/extension.store.js';
import { TrustService } from './trust.service.js';

@Controller('public')
@UseInterceptors(ExtensionNoStoreInterceptor)
export class TrustPublicController {
 constructor(private readonly trust:TrustService){}
 @Get('trust-policy') policy(){return this.trust.policy();}
}
@Controller('reports')
@UseGuards(SessionAuthGuard)
@UseInterceptors(ExtensionNoStoreInterceptor)
export class TrustReportsController {
 constructor(private readonly trust:TrustService){}
 @Get(':id/appeals') list(@CurrentUser() actor:Actor,@Param('id') id:string){return this.trust.ownerAppeals(actor,id);}
 @Post(':id/appeals') @HttpCode(201)
 create(@CurrentUser() actor:Actor,@Param('id') id:string,@Headers('if-match') match:string,@Headers('idempotency-key') key:string,@Body() body:unknown){return this.trust.createAppeal(actor,id,revision(match),key,body);}
}
@Controller('report-appeals')
@UseGuards(SessionAuthGuard)
@UseInterceptors(ExtensionNoStoreInterceptor)
export class TrustAppealsController {
 constructor(private readonly trust:TrustService){}
 @Get(':id/media/:mediaId/url') mediaUrl(@CurrentUser() actor:Actor,@Param('id') id:string,@Param('mediaId') mediaId:string){return this.trust.appealMediaUrl(actor,id,mediaId);}
 @Patch(':id') revise(@CurrentUser() actor:Actor,@Param('id') id:string,@Headers('if-match') match:string,@Headers('idempotency-key') key:string,@Body() body:unknown){return this.trust.reviseAppeal(actor,id,revision(match),key,body);}
}
@Controller('admin')
@UseGuards(SessionAuthGuard,AdminGuard)
@UseInterceptors(ExtensionNoStoreInterceptor)
export class TrustAdminController {
 constructor(private readonly trust:TrustService){}
 @Get('trust-settings') policy(@CurrentUser() actor:Actor){return this.trust.policy();}
 @Put('trust-settings') save(@CurrentUser() actor:Actor,@Headers('if-match') match:string,@Headers('idempotency-key') key:string,@Body() body:unknown){return this.trust.savePolicy(actor,revision(match),key,body);}
 @Get('report-appeals') appeals(@CurrentUser() actor:Actor,@Query() query:Record<string,unknown>){return this.trust.queue(actor,query);}
 @Post('report-appeals/:id/decisions') @HttpCode(200)
 decide(@CurrentUser() actor:Actor,@Param('id') id:string,@Headers('if-match') match:string,@Headers('idempotency-key') key:string,@Body() body:unknown){return this.trust.decideAppeal(actor,id,revision(match),key,body);}
}
