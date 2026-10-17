import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicationsService } from '../src/publications/publications.service.js';

test('existing QA drafts cannot be edited, approved, published or delivered even with approved evidence',async()=>{
 for(const fields of [{description:'QA TEST: laporan sintetis',public_summary:'Ringkasan'}, {description:'Catatan internal',public_summary:'[DATA UJI QA] simulasi'}]){
  const service=Object.create(PublicationsService.prototype) as PublicationsService;
  const report={id:'report-1',revision:3,status:'verified',public_visibility:'public',instagram_allowed:true,...fields};
  let signed=0;
  Object.assign(service,{config:{APP_ORIGIN:'https://vergo.example'},store:{db:async()=>[{media_id:'photo',id:'approval'}]},evidence:{subject:async()=>report},objects:{createSignedGetUrl:async()=>{signed++;return {url:'https://objects.invalid/photo',expiresAt:new Date()};}}});
  const dto=Reflect.get(service,'dto') as (post:Record<string,unknown>)=>Promise<Record<string,any>>;
  const result=await dto.call(service,{id:'post-1',report_id:report.id,kind:'initial',source_revision:3,source_snapshot:{reportId:report.id},status:'draft',published_at:null,created_at:new Date(),updated_at:new Date(),retracted_at:null,rendition_status:'ready',rendition_object_key:'poster.jpg',approval:{status:'approved'}});
  for(const action of ['edit','approve','publish']){
   assert.equal(result.actions[action].allowed,false,action);
   assert.equal(result.actions[action].reasonCode,'SYNTHETIC_QA_SOURCE');
  }
  assert.equal(result.rendition.url,null);
  assert.equal(signed,0);
  assert.equal(result.actions.cancel.allowed,true,'admin may still cancel an unpublished test draft');
  await assert.rejects(service.sourceAsset((async()=>{throw new Error('must reject before looking up media');}) as never,report,'photo'),(error:any)=>error.getStatus()===409&&error.getResponse().code==='SOURCE_NOT_APPROVED');
 }
});

test('a withdrawn resolution milestone remains visible to admin as affected material instead of breaking the publication list',async()=>{
 const service=Object.create(PublicationsService.prototype) as PublicationsService;
 const db=async()=>[];
 Object.assign(service,{config:{APP_ORIGIN:'https://vergo.example'},store:{db},evidence:{subject:async()=>({id:'report-1',revision:4,status:'in_progress',public_visibility:'public',instagram_allowed:true,public_summary:'Updated report'})}});
 const dto=Reflect.get(service,'dto') as (post:Record<string,unknown>)=>Promise<Record<string,any>>;
 const result=await dto.call(service,{id:'post-1',created_at:new Date('2026-10-04'),updated_at:new Date('2026-10-04'),retracted_at:null,report_id:'report-1',kind:'resolution',milestone_id:'old-resolution',source_revision:3,source_snapshot:{reportId:'report-1'},status:'published',published_at:new Date('2026-10-04'),rendition_status:'ready',approval:{status:'invalidated'}});
 assert.equal(result.sourceUpdate.followUpRequired,true);
 assert.equal(result.sourceUpdate.reason,'SOURCE_REVISION_CHANGED');
 assert.equal(result.sourceUpdate.currentStatus,'in_progress');
 assert.equal(result.rendition.url,null,'unavailable evidence is never exposed through an old preview');
 assert.equal(result.actions.publish.allowed,false);
 assert.equal(result.source.publicUrl,'https://vergo.example/incidents/report-1');
});

test('an existing publication links to the current canonical incident after a duplicate merge',async()=>{
 const service=Object.create(PublicationsService.prototype) as PublicationsService;
 Object.assign(service,{config:{APP_ORIGIN:'https://vergo.example'},store:{db:async()=>[]},evidence:{subject:async()=>({id:'old-report',duplicate_of_id:'canonical-report',revision:5,status:'duplicate',public_visibility:'private',instagram_allowed:false})}});
 const dto=Reflect.get(service,'dto') as (post:Record<string,unknown>)=>Promise<Record<string,any>>;
 const result=await dto.call(service,{id:'post-1',created_at:new Date('2026-10-04'),updated_at:new Date('2026-10-04'),retracted_at:null,report_id:'old-report',kind:'initial',source_revision:3,source_snapshot:{reportId:'old-report',scanId:'not-a-public-incident'},status:'published',published_at:new Date('2026-10-04'),approval:{status:'invalidated'}});
 assert.equal(result.source.canonicalId,'canonical-report');
 assert.equal(result.source.publicUrl,'https://vergo.example/incidents/canonical-report');
 assert.equal(result.sourceUpdate.publicUrl,result.source.publicUrl);
 assert.equal(result.sourceUpdate.followUpRequired,true);
 assert.equal(result.actions.approve.allowed,false);
});
