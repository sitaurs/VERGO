import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { appealBody, policyBody, TrustService } from '../src/trust/trust.service.js';
import type { Tx } from '../src/infrastructure/idempotency.store.js';

function errorCode(error: unknown): string {
  const body=(error as HttpException).getResponse?.();
  return typeof body==='object'&&body!==null?(body as {code?:string}).code??'':'';
}

const MEDIA='11111111-1111-4111-8111-111111111111';
const REPORT='22222222-2222-4222-8222-222222222222';
const APPEAL='33333333-3333-4333-8333-333333333333';
const KEY='44444444-4444-4444-8444-444444444444';

test('appeal input accepts a short private evidence set and normalizes its reason',()=>{
  assert.deepEqual(appealBody({reason:'  Saya memiliki bukti tambahan yang perlu diperiksa.  ',mediaIds:[MEDIA]}),{
    reason:'Saya memiliki bukti tambahan yang perlu diperiksa.',mediaIds:[MEDIA],
  });
});

test('appeal input rejects too-short reasons, duplicate attachments, and unknown fields',()=>{
  assert.throws(()=>appealBody({reason:'Singkat',mediaIds:[]}),e=>errorCode(e)==='VALIDATION_ERROR');
  assert.throws(()=>appealBody({reason:'Alasan cukup panjang untuk diperiksa moderator.',mediaIds:[MEDIA,MEDIA]}),e=>errorCode(e)==='VALIDATION_ERROR');
  assert.throws(()=>appealBody({reason:'Alasan cukup panjang untuk diperiksa moderator.',mediaIds:[],status:'accepted'}),e=>errorCode(e)==='VALIDATION_ERROR');
});

test('trust settings are optional, clearable, and HTTPS only',()=>{
  assert.deepEqual(policyBody({operatorLabel:null,contactUrl:'',reviewNotice:'',retentionNotice:null}),{
    operatorLabel:null,contactUrl:null,reviewNotice:null,retentionNotice:null,
  });
  assert.equal(policyBody({operatorLabel:'Tim VERGO',contactUrl:'https://example.org/panduan',reviewNotice:null,retentionNotice:null}).contactUrl,'https://example.org/panduan');
  assert.throws(()=>policyBody({contactUrl:'http://example.org'}),e=>errorCode(e)==='VALIDATION_ERROR');
  assert.throws(()=>policyBody({contactUrl:'https://user:pass@example.org'}),e=>errorCode(e)==='VALIDATION_ERROR');
});

function appealDecisionService(underlyingDecisionActorId:string){
 const now=new Date('2026-10-17T12:00:00.000Z');
 const appeal={id:APPEAL,report_id:REPORT,appellant_id:'55555555-5555-4555-8555-555555555555',source_revision:2,
  reason:'Saya mengajukan bukti untuk diperiksa kembali.',media_ids:[],status:'pending',revision:1,decision_reason:null,
  created_at:now,updated_at:now,report_status:'verified',report_revision:2,underlying_decision_actor_id:underlyingDecisionActorId};
 const calls:string[]=[];
 const tx=Object.assign((async(strings:TemplateStringsArray,..._values:unknown[])=>{
  const sql=strings.join('?');calls.push(sql);
  if(sql.includes('SELECT id FROM reports WHERE id=(SELECT report_id FROM report_appeals'))return [{id:REPORT}];
  if(sql.includes('underlying.actor_id AS underlying_decision_actor_id'))return [appeal];
  if(sql.includes('UPDATE report_appeals SET status='))return [{...appeal,status:'accepted',decision_reason:'Bukti akan diperiksa admin lain.',
   decided_by:'66666666-6666-4666-8666-666666666666',revision:2,updated_at:new Date('2026-10-17T12:05:00.000Z')}];
  return [];
 }) as unknown as Tx,{json:(value:unknown)=>value});
 const store={mutate:async(_actor:unknown,_route:string,_key:string,_payload:unknown,work:(tx:Tx)=>Promise<unknown>)=>work(tx),audit:async()=>undefined};
 return {service:new TrustService(store as never,{} as never),calls};
}

function admin(id:string){return {id,email:'moderator@example.test',displayName:'Moderator QA',role:'admin' as const,emailVerified:true,sapaEnabled:true,avatarMediaId:null};}

test('the moderator whose report decision is appealed cannot decide the appeal through the API',async()=>{
 const {service,calls}=appealDecisionService('66666666-6666-4666-8666-666666666666');
 await assert.rejects(service.decideAppeal(admin('66666666-6666-4666-8666-666666666666'),APPEAL,1,KEY,
  {action:'accept_review',reason:'Akan ditinjau ulang.',reportRevision:2}),error=>error instanceof HttpException&&error.getStatus()===403&&errorCode(error)==='APPEAL_REVIEWER_RECUSED');
 assert.equal(calls.some(sql=>sql.includes('UPDATE report_appeals SET status=')),false,'recused moderator cannot change appeal status');
});

test('a different admin can accept an appeal for review',async()=>{
 const {service,calls}=appealDecisionService('66666666-6666-4666-8666-666666666666');
 const result=await service.decideAppeal(admin('77777777-7777-4777-8777-777777777777'),APPEAL,1,KEY,
  {action:'accept_review',reason:'Bukti akan ditinjau oleh moderator lain.',reportRevision:2});
 assert.equal(result.status,'accepted');
 assert.equal(calls.some(sql=>sql.includes('UPDATE report_appeals SET status=')),true);
});

test('appeal queue marks the underlying report moderator so the UI can disable review for that admin',async()=>{
 const row={id:APPEAL,report_id:REPORT,appellant_id:'55555555-5555-4555-8555-555555555555',source_revision:2,
  reason:'Saya mengajukan bukti untuk diperiksa kembali.',media_ids:[],status:'accepted',revision:2,decision_reason:'Diterima untuk ditinjau ulang.',
  created_at:new Date('2026-10-17T12:00:00.000Z'),updated_at:new Date('2026-10-17T12:05:00.000Z'),report_status:'verified',report_revision:2,reviewer_recused:true};
 const db=Object.assign(async(_strings:TemplateStringsArray)=>[row],{begin:async()=>undefined});
 const store={db,cursor:()=>({limit:20,boundary:null,encode:()=>''})};
 const service=new TrustService(store as never,{} as never);
 const page=await service.queue(admin('66666666-6666-4666-8666-666666666666'),{status:'accepted'});
 assert.equal(page.items[0]?.reviewerRecused,true);
});
