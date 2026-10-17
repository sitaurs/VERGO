import { Injectable } from '@nestjs/common';
import { ExtensionStore, fail, iso, requireAdmin, requireVerified, type Actor } from '../extensions/extension.store.js';
import * as input from '../extensions/input.js';
import type { Tx } from '../infrastructure/idempotency.store.js';
import { ObjectStorageService } from '../media/object-storage.service.js';

type AppealStatus = 'pending'|'needs_evidence'|'accepted'|'rejected';
type AppealRow = { id:string; report_id:string; appellant_id:string|null; source_revision:number; reason:string; media_ids:string[]; status:AppealStatus; revision:number; decision_reason:string|null; created_at:Date; updated_at:Date; report_status:string; report_revision:number; reviewer_recused?:boolean; underlying_decision_actor_id?:string|null };
export function appealBody(value:unknown): { reason:string; mediaIds:string[] } {
 const body=input.object(value,['reason','mediaIds']);
 return {reason:input.text(body.reason,20,2000),mediaIds:input.ids(body.mediaIds??[],0,3)};
}
export function policyBody(value:unknown) {
 const body=input.object(value,['operatorLabel','contactUrl','reviewNotice','retentionNotice']);
 const optional=(key:string,max:number) => body[key]===null||body[key]===undefined||body[key]===''?null:input.text(body[key],1,max);
 const contactUrl=optional('contactUrl',500);
 if(contactUrl){
  let url:URL;try{url=new URL(contactUrl);}catch{fail(400,'VALIDATION_ERROR','Tautan bantuan harus berupa URL HTTPS.');}
  if(url.protocol!=='https:'||url.username||url.password)fail(400,'VALIDATION_ERROR','Tautan bantuan harus HTTPS tanpa kredensial.');
 }
 return {operatorLabel:optional('operatorLabel',100),contactUrl,reviewNotice:optional('reviewNotice',1000),retentionNotice:optional('retentionNotice',1000)};
}
function view(row:AppealRow) {
 return {id:row.id,reportId:row.report_id,sourceRevision:row.source_revision,reportRevision:row.report_revision,reportStatus:row.report_status,
  reason:row.reason,mediaIds:row.media_ids,status:row.status,revision:row.revision,decisionReason:row.decision_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),
  ...(row.reviewer_recused === undefined ? {} : {reviewerRecused:row.reviewer_recused})};
}

@Injectable()
export class TrustService {
 constructor(private readonly store:ExtensionStore,private readonly objects:ObjectStorageService){}

 async appealMediaUrl(actor:Actor,id:string,mediaId:string){
  input.uuid(id);input.uuid(mediaId);
  return this.store.db.begin(async tx=>{
   // Deletion locks parent reports first; hold the same fence while authorizing
   // and signing an original, private attachment.
   const [parent]=await tx`SELECT id FROM reports WHERE id=(SELECT report_id FROM report_appeals WHERE id=${id}) FOR SHARE`;
   if(!parent)fail(404,'NOT_FOUND');
   const [media]=await tx`SELECT m.object_key FROM report_appeals a
    JOIN reports r ON r.id=a.report_id AND r.reporter_id=a.appellant_id
    JOIN users u ON u.id=a.appellant_id AND u.deleted_at IS NULL
    JOIN media m ON m.id=ANY(a.media_ids) AND m.owner_id=a.appellant_id
    WHERE a.id=${id} AND m.id=${mediaId} AND m.purpose='report' AND m.state='stored' AND m.deleted_at IS NULL
      AND (${actor.role==='admin'} OR a.appellant_id=${actor.id}) FOR SHARE OF a,m`;
   if(!media)fail(404,'NOT_FOUND');
   const signed=await this.objects.createSignedGetUrl(media.object_key);
   return {url:signed.url,expiresAt:signed.expiresAt.toISOString()};
  });
 }

 async policy(){
  const [row]=await this.store.db`SELECT revision,operator_label,contact_url,review_notice,retention_notice,updated_at FROM trust_settings WHERE id='singleton'`;
  return {revision:row!.revision,operatorLabel:row!.operator_label,contactUrl:row!.contact_url,reviewNotice:row!.review_notice,retentionNotice:row!.retention_notice,updatedAt:iso(row!.updated_at)};
 }
 async savePolicy(actor:Actor,expected:number,key:string,raw:unknown){
  requireAdmin(actor);const body=policyBody(raw);
  return this.store.mutate(actor,'admin/trust-settings',key,{expected,...body},async tx=>{
   const [row]=await tx`SELECT revision FROM trust_settings WHERE id='singleton' FOR UPDATE`;
   input.checkRevision(row!.revision,expected);
   const [saved]=await tx`UPDATE trust_settings SET operator_label=${body.operatorLabel},contact_url=${body.contactUrl},review_notice=${body.reviewNotice},retention_notice=${body.retentionNotice},revision=revision+1,updated_at=now() WHERE id='singleton' RETURNING *`;
   await this.store.audit(tx,actor.id,'trust.settings.changed','trust_settings','singleton',{revision:saved!.revision});
   return {revision:saved!.revision,...body,updatedAt:iso(saved!.updated_at)};
  });
 }
 async ownerAppeals(actor:Actor,reportId:string){
  input.uuid(reportId);
  const [report]=await this.store.db`SELECT id FROM reports WHERE id=${reportId} AND reporter_id=${actor.id}`;
  if(!report)fail(404,'NOT_FOUND');
  const rows=await this.store.db<AppealRow[]>`SELECT a.*,r.status AS report_status,r.revision AS report_revision FROM report_appeals a JOIN reports r ON r.id=a.report_id WHERE a.report_id=${reportId} AND a.appellant_id=${actor.id} ORDER BY a.created_at DESC,a.id DESC LIMIT 50`;
  return {items:rows.map(view),nextCursor:null};
 }
 async createAppeal(actor:Actor,reportId:string,expected:number,key:string,raw:unknown){
  requireVerified(actor);input.uuid(reportId);const body=appealBody(raw);
  return this.store.mutate(actor,`reports/${reportId}/appeals`,key,{expected,...body},async tx=>{
   const [report]=await tx`SELECT id,status,revision FROM reports WHERE id=${reportId} AND reporter_id=${actor.id} FOR UPDATE`;
   if(!report)fail(404,'NOT_FOUND');input.checkRevision(report.revision,expected);
   if(report.status==='submitted')fail(409,'DECISION_REQUIRED','Laporan masih menunggu pemeriksaan. Anda dapat melengkapi laporan.');
   await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`report-appeal:${actor.id}`},0))`;
   const [existing]=await tx`SELECT id FROM report_appeals WHERE report_id=${reportId} AND appellant_id=${actor.id} AND status IN ('pending','needs_evidence')`;
   if(existing)fail(409,'PENDING_APPEAL_EXISTS','Permintaan peninjauan sebelumnya masih diproses.');
   const [count]=await tx`SELECT count(*)::integer AS n FROM report_appeals WHERE appellant_id=${actor.id} AND created_at>now()-interval '1 day'`;
   if(count!.n>=5)fail(429,'RATE_LIMITED','Maksimal lima permintaan peninjauan per hari.');
   await this.checkMedia(tx,actor,body.mediaIds);
   const [row]=await tx<AppealRow[]>`INSERT INTO report_appeals(report_id,appellant_id,source_revision,reason,media_ids)
    VALUES(${reportId},${actor.id},${expected},${body.reason},${body.mediaIds}::uuid[]) RETURNING *`;
   await this.store.audit(tx,actor.id,'report.appeal.submitted','report',reportId,{appealId:row!.id,sourceRevision:expected});
   return view({...row!,report_status:report.status,report_revision:report.revision});
  },201);
 }
 async reviseAppeal(actor:Actor,id:string,expected:number,key:string,raw:unknown){
  requireVerified(actor);input.uuid(id);const body=appealBody(raw);
  return this.store.mutate(actor,`report-appeals/${id}`,key,{expected,...body},async tx=>{
   await this.lockAppealReport(tx,id);
   const [row]=await tx<AppealRow[]>`SELECT a.*,r.status AS report_status,r.revision AS report_revision FROM report_appeals a JOIN reports r ON r.id=a.report_id WHERE a.id=${id} AND a.appellant_id=${actor.id} AND r.reporter_id=${actor.id} FOR UPDATE OF a`;
   if(!row)fail(404,'NOT_FOUND');input.checkRevision(row.revision,expected);
   if(row.status!=='needs_evidence')fail(409,'INVALID_TRANSITION','Pelengkapan tersedia setelah moderator meminta bukti.');
   await this.checkMedia(tx,actor,body.mediaIds);
   const [saved]=await tx<AppealRow[]>`UPDATE report_appeals SET reason=${body.reason},media_ids=${body.mediaIds}::uuid[],status='pending',decision_reason=NULL,decided_by=NULL,revision=revision+1,updated_at=now() WHERE id=${id} RETURNING *`;
   await this.store.audit(tx,actor.id,'report.appeal.revised','report',row.report_id,{appealId:id,revision:saved!.revision});
   return view({...saved!,report_status:row.report_status,report_revision:row.report_revision});
  });
 }
 async queue(actor:Actor,query:Record<string,unknown>){
  requireAdmin(actor);input.object(query,['limit','cursor','status']);
  const status=query.status===undefined?'pending':input.enumeration(query.status,['pending','needs_evidence','accepted','rejected'] as const);
  const page=this.store.cursor(query,{route:'report-appeals',status});
  const rows=await this.store.db<AppealRow[]>`SELECT a.*,r.status AS report_status,r.revision AS report_revision,
   COALESCE(underlying.actor_id=${actor.id},false) AS reviewer_recused
   FROM report_appeals a JOIN reports r ON r.id=a.report_id JOIN users u ON u.id=a.appellant_id AND u.deleted_at IS NULL
   LEFT JOIN LATERAL (SELECT actor_id FROM moderation_decisions md WHERE md.report_id=a.report_id AND md.revision_before<a.source_revision
    ORDER BY md.revision_before DESC,md.created_at DESC LIMIT 1) underlying ON TRUE
   WHERE a.status=${status} AND (${page.boundary?.at??null}::timestamptz IS NULL OR (a.created_at,a.id)<(${page.boundary?.at??null}::timestamptz,${page.boundary?.id??null}::uuid)) ORDER BY a.created_at DESC,a.id DESC LIMIT ${page.limit+1}`;
  const chosen=rows.slice(0,page.limit);
  return {items:chosen.map(view),nextCursor:rows.length>page.limit?page.encode(chosen[chosen.length-1]!):null};
 }
 async decideAppeal(actor:Actor,id:string,expected:number,key:string,raw:unknown){
  requireAdmin(actor);input.uuid(id);const body=input.object(raw,['action','reason','reportRevision']);
  const action=input.enumeration(body.action,['accept_review','reject','request_evidence']);const reason=input.text(body.reason,5,1000);const reportRevision=input.integer(body.reportRevision);
  return this.store.mutate(actor,`admin/report-appeals/${id}/decisions`,key,{expected,action,reason,reportRevision},async tx=>{
   await this.lockAppealReport(tx,id);
   const [row]=await tx<AppealRow[]>`SELECT a.*,r.status AS report_status,r.revision AS report_revision,underlying.actor_id AS underlying_decision_actor_id
    FROM report_appeals a JOIN reports r ON r.id=a.report_id JOIN users u ON u.id=a.appellant_id AND u.deleted_at IS NULL
    LEFT JOIN LATERAL (SELECT actor_id FROM moderation_decisions md WHERE md.report_id=a.report_id AND md.revision_before<a.source_revision
     ORDER BY md.revision_before DESC,md.created_at DESC LIMIT 1) underlying ON TRUE
    WHERE a.id=${id} FOR UPDATE OF a,r`;
   if(!row)fail(404,'NOT_FOUND');input.checkRevision(row.revision,expected);input.checkRevision(row.report_revision,reportRevision);
   if(row.status!=='pending')fail(409,'INVALID_TRANSITION');
   if(row.appellant_id===actor.id)fail(403,'SELF_REVIEW_FORBIDDEN','Permintaan sendiri harus ditinjau admin lain.');
   if(row.underlying_decision_actor_id===actor.id)fail(403,'APPEAL_REVIEWER_RECUSED','Admin yang membuat keputusan awal tidak dapat memutuskan tindak lanjut banding ini. Minta admin lain untuk melanjutkan.');
   const status=action==='accept_review'?'accepted':action==='reject'?'rejected':'needs_evidence';
   const [saved]=await tx<AppealRow[]>`UPDATE report_appeals SET status=${status},decision_reason=${reason},decided_by=${actor.id},revision=revision+1,updated_at=now() WHERE id=${id} RETURNING *`;
   await tx`INSERT INTO notifications(user_id,event_key,type,title,message,target_path) VALUES(${row.appellant_id},${`appeal:${id}:${expected+1}`},'evidence_requested','Permintaan peninjauan diperbarui',${reason},${`/dashboard?view=reports&report=${row.report_id}`}) ON CONFLICT(user_id,event_key,type) DO NOTHING`;
   await this.store.audit(tx,actor.id,`report.appeal.${action}`,'report',row.report_id,{appealId:id,sourceRevision:row.source_revision,reviewedReportRevision:reportRevision});
   // Accepting a re-review does not bypass moderation, evidence or point rules.
   return view({...saved!,report_status:row.report_status,report_revision:row.report_revision});
  });
 }
 private async lockAppealReport(tx:Tx,id:string){
  const [report]=await tx`SELECT id FROM reports WHERE id=(SELECT report_id FROM report_appeals WHERE id=${id}) FOR UPDATE`;
  if(!report)fail(404,'NOT_FOUND');
 }
 private async checkMedia(tx:Tx,actor:Actor,ids:string[]){
  if(!ids.length)return;
  const rows=await tx`SELECT id FROM media WHERE id=ANY(${ids}::uuid[]) AND owner_id=${actor.id} AND purpose='report' AND state='stored' AND deleted_at IS NULL ORDER BY id FOR UPDATE`;
  if(rows.length!==ids.length)fail(422,'EVIDENCE_INVALID','Bukti harus foto laporan milik pengirim.');
  await tx`UPDATE media SET expires_at=NULL WHERE id=ANY(${ids}::uuid[])`;
 }
}
