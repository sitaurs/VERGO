import { r1Get, r1Mutate, type R1, type Page, query } from './r1';

export type ReportAppeal = R1['ReportAppeal'];
export type TrustPolicy = R1['TrustPolicy'];
export type AppealInput = R1['ReportAppealInput'];
export const publicTrustPolicy=(signal?:AbortSignal)=>r1Get<TrustPolicy>('/public/trust-policy',signal);
export const trustSettings=(signal?:AbortSignal)=>r1Get<TrustPolicy>('/admin/trust-settings',signal);
export const saveTrustSettings=(value:R1['TrustPolicyInput'],revision:number,key:string)=>r1Mutate<TrustPolicy>('PUT','/admin/trust-settings',value,revision,key);
export const reportAppeals=(id:string,signal?:AbortSignal)=>r1Get<Page<ReportAppeal>>(`/reports/${encodeURIComponent(id)}/appeals`,signal);
export const appealMediaUrl=(appealId:string,mediaId:string,signal?:AbortSignal)=>r1Get<{url:string;expiresAt:string}>(`/report-appeals/${encodeURIComponent(appealId)}/media/${encodeURIComponent(mediaId)}/url`,signal);
export const submitAppeal=(id:string,value:AppealInput,revision:number,key:string)=>r1Mutate<ReportAppeal>('POST',`/reports/${encodeURIComponent(id)}/appeals`,value,revision,key);
export const reviseAppeal=(appeal:ReportAppeal,value:AppealInput,key:string)=>r1Mutate<ReportAppeal>('PATCH',`/report-appeals/${encodeURIComponent(appeal.id)}`,value,appeal.revision,key);
export const listAppeals=(status:ReportAppeal['status'],cursor?:string,signal?:AbortSignal)=>r1Get<Page<ReportAppeal>>(`/admin/report-appeals?${query({status,cursor,limit:20})}`,signal);
export const decideAppeal=(appeal:ReportAppeal,action:R1['ReportAppealDecisionInput']['action'],reason:string,key:string)=>r1Mutate<ReportAppeal>('POST',`/admin/report-appeals/${encodeURIComponent(appeal.id)}/decisions`,{action,reason,reportRevision:appeal.reportRevision},appeal.revision,key);
