import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicationProcessor, isSyntheticQaSource, normalizeInstagramHashtags, normalizeInstagramTemplate, publicationStatusCaption, selectPublicationAsset } from '../src/publication-processor.js';

test('worker QA exclusion uses explicit leading markers in either source field',()=>{
 for(const value of ['QA TEST: simulasi','qa test only',' [ data uji qa ] gambar sintetis']){
  assert.equal(isSyntheticQaSource({description:value}),true);
  assert.equal(isSyntheticQaSource({public_summary:value}),true);
 }
 for(const value of ['Sampah di taman','Masyarakat meminta QA TEST diadakan','QA TESTING bukan penanda','[QA] catatan']){
  assert.equal(isSyntheticQaSource({description:value,public_summary:value}),false);
 }
});

test('automatic source events exclude synthetic QA but continue generating eligible ordinary drafts',async()=>{
 for(const [fields,expectDraft] of [
  [{description:'QA TEST: sampah sintetis',public_summary:'Ringkasan'},false],
  [{description:'Laporan',public_summary:'[DATA UJI QA] simulasi'},false],
  [{description:'Sampah ditemukan di taman',public_summary:'Tumpukan sampah di kawasan taman'},true],
 ] as const){
  const writes:string[]=[];
  const db=Object.assign(async(parts:TemplateStringsArray)=>{
   const statement=parts.join(' ');
   if(statement.includes('SELECT r.*,c.name_id'))return [{id:'report-1',revision:3,created_at:new Date(),status:'verified',public_visibility:'public',instagram_allowed:true,...fields}];
   if(statement.includes('SELECT * FROM instagram_posts'))return [];
   if(statement.includes('FROM instagram_accounts'))return [{status:'connected',encrypted_credentials:'secret',ig_user_id:'account',scopes:['instagram_basic']}];
   if(statement.includes('FROM instagram_settings'))return [{payload:{draftGeneration:'automatic'}}];
   if(statement.includes('SELECT a.media_id'))return [{media_id:'photo',rendition_id:'rendition',subject_type:'report',subject_id:'report-1'}];
   if(statement.includes('SELECT * FROM instagram_publication_series'))return [{id:'series',generation:0}];
   if(/^\s*(INSERT|UPDATE)/.test(statement))writes.push(statement);
   if(statement.includes('INSERT INTO instagram_posts('))return [{id:'post-1',content_revision:1}];
   return [];
  },{json:(value:unknown)=>value,begin:async(work:(tx:unknown)=>unknown)=>work(db)});
  const processor=new PublicationProcessor(db as never,{APP_ORIGIN:'https://vergo.example',SAP_EXTENSION_ENABLED:true,SAP_INSTAGRAM_ENABLED:true,SAP_INSTAGRAM_RENDER_ENABLED:true} as never,{} as never);
  await processor.process({topic:'report.verified',aggregate_id:'report-1',payload_minimal:{}});
  if(expectDraft){
   assert.equal(writes.filter(sql=>sql.includes('INSERT INTO instagram_posts(')).length,1);
   assert.equal(writes.filter(sql=>sql.includes('INSERT INTO outbox_events')).length,1);
  }else assert.deepEqual(writes,[],'must not enqueue rendering, publishing or retraction');
 }
});

test('worker rejects an existing QA draft before poster rendering or publication',async()=>{
 const db=async(parts:TemplateStringsArray)=>{
  assert.match(parts.join(' '),/SELECT description,public_summary FROM reports/);
  return [{description:'QA TEST ONLY. Bukan kejadian nyata.',public_summary:'Ringkasan'}];
 };
 const processor=new PublicationProcessor(db as never,{} as never,{} as never);
 const eligible=Reflect.get(processor,'eligible') as (post:Record<string,unknown>)=>Promise<boolean>;
 assert.equal(await eligible.call(processor,{id:'post-1',report_id:'report-1'}),false);
});

test('ordinary eligible reports still pass the worker publication guard',async()=>{
 const db=async(parts:TemplateStringsArray)=>{
  const query=parts.join(' ');
  if(query.includes('SELECT description,public_summary'))return [{description:'Sampah di taman',public_summary:'Tumpukan sampah di kawasan taman'}];
  return [{id:'approved-evidence'}];
 };
 const processor=new PublicationProcessor(db as never,{} as never,{} as never);
 const eligible=Reflect.get(processor,'eligible') as (post:Record<string,unknown>)=>Promise<boolean>;
 assert.equal(await eligible.call(processor,{id:'post-1',report_id:'report-1',media_id:'photo',evidence_rendition_id:'rendition',kind:'initial'}),true);
});

test('automatic initial drafts select only Instagram-approved evidence attached to the report', () => {
  const reportId = 'report-1';
  const assets = [
    { media_id: 'update-photo', subject_type: 'community_update', subject_id: 'update-1' },
    { media_id: 'result-photo', subject_type: 'activity_result', subject_id: 'result-1' },
    { media_id: 'report-photo', subject_type: 'report', subject_id: reportId },
  ];
  const initialSources = [{ subject_type: 'report', subject_id: reportId }];

  assert.equal(selectPublicationAsset(assets.slice(0, 2), initialSources), undefined);
  assert.equal(selectPublicationAsset(assets, initialSources)?.media_id, 'report-photo');
});

test('resolution drafts continue to require the approved milestone evidence source', () => {
  const sources = [{ media_id: 'after-photo', subject_type: 'activity_result', subject_id: 'result-1' }];
  const assets = [
    { media_id: 'report-photo', subject_type: 'report', subject_id: 'report-1' },
    { media_id: 'after-photo', subject_type: 'activity_result', subject_id: 'result-1' },
  ];

  assert.equal(selectPublicationAsset(assets, sources)?.media_id, 'after-photo');
});

test('automatic captions preserve a canonical status link and refresh observation metadata without duplicate footer', async () => {
  const source = { occurredAt: '2026-10-05T00:00:00Z', area: { label: 'Kauman, Kota Malang' }, publicUrl: 'https://vergo.example/incidents/report-1' };
  const caption = publicationStatusCaption('Penanganan sebagian. Bukti terbaru.', source);
  assert.match(caption, /Penanganan sebagian/);
  assert.match(caption, /Laporan warga · bukti ditinjau moderator/);
  assert.match(caption, /Pengamatan: 5 Okt 2026 · Kauman, Kota Malang/);
  assert.ok(caption.endsWith(source.publicUrl));
  assert.equal(publicationStatusCaption(caption, source), caption);
});

test('new automatic copy replaces legacy branding and keeps only the configured canonical status link', () => {
  const source = { occurredAt: '2026-10-05T00:00:00Z', area: { label: 'Kauman, Kota Malang' }, publicUrl: 'https://vergo.example/incidents/report-1' };
  const stale = 'Pantau perkembangan di SAP: https://sap.venlab.tech/incidents/old\n#SAP #Lingkungan';
  const caption = publicationStatusCaption(stale, source);
  assert.doesNotMatch(caption, /\bSAP\b|sap\.venlab\.tech/i);
  assert.match(caption, /#VERGO #Lingkungan/);
  assert.equal(caption.split(source.publicUrl).length - 1, 1);
  assert.equal(normalizeInstagramTemplate('{summary} Pantau di SAP: {url}'), '{summary} Pantau di VERGO: {url}');
  assert.equal(normalizeInstagramHashtags('#SAP #Lingkungan'), '#VERGO #Lingkungan');
});
