import { Injectable } from '@nestjs/common';
import { ExtensionStore, type Actor, fail, iso, requireFeature } from '../extensions/extension.store.js';
import { bool, date, object, uuid } from '../extensions/input.js';
import { ActivitiesService } from './activities.service.js';
import { queryBool, type NotificationType } from './activities.types.js';
import { SYNTHETIC_QA_DESCRIPTION_PATTERN } from '../reports/synthetic-qa.js';

type NotificationRow={id:string;user_id:string;event_key:string;type:NotificationType;title:string;message:string;target_path:string;read:boolean;created_at:Date};
export function notificationCopy(value:string):string {
 return value.replace(/\bsap\.venlab\.tech\b/gi,'vergo.venlab.tech').replace(/#sap\b/gi,'#VERGO').replace(/\bSAP\b/gi,'VERGO');
}
@Injectable()
export class ImpactService {
 constructor(private readonly store:ExtensionStore,private readonly activities:ActivitiesService) {}
 private async notificationDto(row:NotificationRow){
  let targetPath=row.target_path;
  if(row.type==='evidence_requested'&&targetPath==='/dashboard?view=reports'){
   const [audit]=await this.store.db<{target_id:string}[]>`SELECT a.target_id FROM audit_events a JOIN reports r ON r.id::text=a.target_id
    WHERE a.action='report.evidence_requested' AND a.target_type='report' AND a.actor_id::text=${row.event_key.split(':')[1]??''}
      AND date_trunc('milliseconds',a.created_at)=${row.created_at} AND r.reporter_id=${row.user_id} ORDER BY a.id LIMIT 1`;
   if(audit&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(audit.target_id))targetPath=`/dashboard?view=reports&report=${audit.target_id}`;
  }
  if(['incident_updated','incident_resolved','incident_withdrawn'].includes(row.type)&&targetPath==='/dashboard?view=reports'){
   const reportId=row.event_key.match(/^report-reporter:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):[0-9]+$/i)?.[1];
   if(reportId){
    const [report]=await this.store.db<{id:string}[]>`SELECT id FROM reports WHERE id=${reportId} AND reporter_id=${row.user_id}`;
    if(report)targetPath=`/dashboard?view=reports&report=${report.id}`;
   }
  }
  if(row.type==='community_update_decided'&&(targetPath==='/dashboard?view=reports'||/^\/community-updates(?:\/|$)/.test(targetPath))){
   const updateId=row.event_key.match(/^update:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):[0-9]+$/i)?.[1];
   if(updateId){
    const [update]=await this.store.db<{report_id:string}[]>`SELECT report_id FROM community_updates WHERE id=${updateId} AND author_id=${row.user_id}`;
    if(update&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(update.report_id))targetPath=`/dashboard?view=reports&report=${update.report_id}`;
   }
  }
  return {id:row.id,type:row.type,title:notificationCopy(row.title),message:notificationCopy(row.message),targetPath,read:row.read,createdAt:iso(row.created_at)};
 }
 async notifications(actor:Actor,query:Record<string,unknown>) {
  requireFeature('evidence');object(query,['limit','cursor','unreadOnly']);const unread=queryBool(query.unreadOnly);const page=this.store.cursor(query,{route:'notifications',user:actor.id,unread});const rows=await this.store.db<NotificationRow[]>`SELECT * FROM notifications WHERE user_id=${actor.id} AND (NOT ${unread} OR read=false) AND (${page.boundary?.at??null}::timestamptz IS NULL OR (created_at,id)<(${page.boundary?.at??null}::timestamptz,${page.boundary?.id??null}::uuid)) ORDER BY created_at DESC,id DESC LIMIT ${page.limit+1}`;const selected=rows.slice(0,page.limit);return {items:await Promise.all(selected.map(r=>this.notificationDto(r))),nextCursor:rows.length>page.limit?page.encode(selected[selected.length-1]!):null};
 }
 async read(actor:Actor,id:string,raw:unknown) {
  requireFeature('evidence');uuid(id);const b=object(raw,['read']);const read=bool(b.read);const [row]=await this.store.db<NotificationRow[]>`UPDATE notifications SET read=${read} WHERE id=${id} AND user_id=${actor.id} RETURNING *`;if(!row)fail(404,'NOT_FOUND');return this.notificationDto(row);
 }
 async summary(query:Record<string,unknown>) {
  requireFeature('activities');object(query,['from','to','cellId']);const from=date(query.from,true),to=date(query.to,true);if(Date.parse(to)<=Date.parse(from)||Date.parse(to)-Date.parse(from)>366*86400000)fail(400,'VALIDATION_ERROR');const cell=query.cellId===undefined?null:this.activities.cell(query.cellId);
  return this.store.db.begin('isolation level repeatable read read only',async tx=>{
   const [clock]=await tx<{at:Date}[]>`SELECT now() AS at`;
   const [reports]=await tx<{count:string;median:number|null}[]>`SELECT count(*)::text AS count,percentile_cont(0.5) WITHIN GROUP(ORDER BY greatest(0,extract(epoch FROM (resolved_at-created_at))/3600))::float8 AS median FROM reports WHERE status='resolved' AND resolved_at>=${from}::timestamptz AND resolved_at<${to}::timestamptz AND public_visibility='public' AND duplicate_of_id IS NULL AND description !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND COALESCE(public_summary,'') !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND (${cell}::text IS NULL OR h3_cell=${cell})`;
   const [activities]=await tx<{count:string;attendances:string;volunteers:string;covered:string}[]>`WITH eligible AS (
    SELECT a.id FROM activities a JOIN activity_results ar ON ar.activity_id=a.id JOIN reports r ON r.id=a.report_id WHERE ar.status='approved' AND ar.approved_at>=${from}::timestamptz AND ar.approved_at<${to}::timestamptz AND a.public_ever AND r.public_visibility='public' AND r.duplicate_of_id IS NULL AND r.description !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND COALESCE(r.public_summary,'') !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND r.status IN ('verified','in_progress','resolved') AND (${cell}::text IS NULL OR r.h3_cell=${cell})
   ) SELECT (SELECT count(*) FROM eligible)::text AS count,(SELECT count(*) FROM activity_memberships m JOIN eligible e ON e.id=m.activity_id WHERE m.status='accepted' AND m.attendance='present')::text AS attendances,(SELECT count(DISTINCT m.statistics_key) FROM activity_memberships m JOIN eligible e ON e.id=m.activity_id WHERE m.status='accepted' AND m.attendance='present')::text AS volunteers,(SELECT count(*) FROM eligible e WHERE EXISTS(SELECT 1 FROM impact_measurements im WHERE im.activity_id=e.id AND im.stage='collected' AND im.status='verified'))::text AS covered`;
   const weights=await tx<{stage:string;weight:string}[]>`SELECT im.stage,sum(im.value_kg)::text AS weight FROM impact_measurements im JOIN activities a ON a.id=im.activity_id JOIN reports r ON r.id=a.report_id WHERE im.status='verified' AND im.measured_at>=${from}::timestamptz AND im.measured_at<${to}::timestamptz AND a.public_ever AND r.public_visibility='public' AND r.duplicate_of_id IS NULL AND r.description !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND COALESCE(r.public_summary,'') !~* ${SYNTHETIC_QA_DESCRIPTION_PATTERN} AND r.status IN ('verified','in_progress','resolved') AND EXISTS(SELECT 1 FROM activity_results ar WHERE ar.activity_id=a.id AND ar.status='approved') AND (${cell}::text IS NULL OR r.h3_cell=${cell}) GROUP BY im.stage`;
   const sum=(stage:string):number|null=>{const row=weights.find(r=>r.stage===stage);return row?Number(row.weight):null;};
   return {from,to,cellId:cell,asOf:iso(clock!.at),resolvedIncidents:Number(reports?.count??0),approvedActivities:Number(activities?.count??0),volunteerAttendances:Number(activities?.attendances??0),uniqueVolunteers:Number(activities?.volunteers??0),medianResolutionHours:reports?.median??null,verifiedKg:{collected:sum('collected'),handedOver:sum('handed_over'),recycled:sum('recycled')},measurementCoverage:{approvedResults:Number(activities?.count??0),resultsWithVerifiedWeight:Number(activities?.covered??0)},scope:'approved_public_sources' as const,methodologyVersion:'sap-local-impact-v1' as const};
  });
 }
}
