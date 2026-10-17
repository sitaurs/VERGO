export const POST_STATUSES=['draft','publishing','published','failed','cancelled','retracting','retracted','needs_action'] as const;
export type PostStatus=typeof POST_STATUSES[number];
export const EMPTY_APPROVAL={status:'unapproved',contentRevision:null,sourceRevision:null,renditionId:null,approvedAt:null};
export const INVALID_APPROVAL={...EMPTY_APPROVAL,status:'invalidated'};
export const REQUIRED_SCOPES=['instagram_basic','instagram_content_publish','pages_show_list','pages_read_engagement'];
export const DELETE_SCOPES=['instagram_basic','instagram_manage_contents'];


export function incidentPublicUrl(origin:string,canonicalId:string):string {
 return new URL(`/incidents/${encodeURIComponent(canonicalId)}`,origin).toString();
}
/** Templates are admin-authored copy, so normalize legacy product branding before any draft is generated. */
export function normalizeInstagramTemplate(value:string):string {
 return value
  .replace(/https?:\/\/(?:www\.)?sap\.venlab\.tech(?:\/[^\s]*)?/gi,'{url}')
  .replace(/\bSAP\b/gi,'VERGO');
}
export function normalizeInstagramHashtags(value:string):string {
 return value.replace(/#SAP\b/gi,'#VERGO');
}
export function publicationCaption(caption:string,source:{occurredAt:string;area:{label:string};publicUrl:string}):string {
 const marker='--- Status VERGO ---';
 const body=caption.split(marker)[0]!.trim()
  .replace(/\bPantau(?:\s+\w+)?\s+di\s+(?:SAP|VERGO)\s*:\s*https?:\/\/[^\s]+/gi,'')
  .replace(/https?:\/\/(?:www\.)?sap\.venlab\.tech[^\s]*/gi,source.publicUrl)
  .replace(/#SAP\b/gi,'#VERGO')
  .replace(/\b(Pantau(?:\s+\w+)?\s+di\s+)SAP\b/gi,'$1VERGO')
  .replaceAll(source.publicUrl,'')
  .replace(/\n[ \t]*\n[ \t]*\n/g,'\n\n').trim();
 const date=new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'Asia/Jakarta'}).format(new Date(source.occurredAt));
 return `${body}\n\n${marker}\nLaporan warga · bukti ditinjau moderator\nPengamatan: ${date} · ${source.area.label}\nKondisi dapat berubah. Status terbaru / koreksi:\n${source.publicUrl}`;
}
export function sourceUpdateState(post:{source_revision:number;published_at:unknown;status:string},report:{revision:number;status:string},sourceEligible:boolean,publicUrl:string){
 const changed=report.revision!==post.source_revision;
 return {currentSourceRevision:report.revision,currentStatus:report.status,changed,
  followUpRequired:!!post.published_at&&!['cancelled','retracted'].includes(post.status)&&(changed||!sourceEligible),
  reason:changed?'SOURCE_REVISION_CHANGED':!sourceEligible?'SOURCE_NOT_APPROVED':null,publicUrl};
}

export function publicationContextReady(post:Record<string,any>,origin:string):boolean {
 const source=post.source_snapshot;
 if(post.template_version!=='vergo-feed-status-v6'||!source?.reportId||!Number.isFinite(Date.parse(source.occurredAt))||!source.area?.label)return false;
 return source.publicUrl===incidentPublicUrl(origin,source.reportId)&&post.caption===publicationCaption(post.caption,source);
}
