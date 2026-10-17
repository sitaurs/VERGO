import assert from 'node:assert/strict';
import test from 'node:test';
import { incidentPublicUrl, publicationCaption, publicationContextReady, sourceUpdateState } from '../src/publications/publication.types.js';

const id='11111111-1111-4111-8111-111111111111';
const origin='https://vergo.example';
const source={reportId:id,occurredAt:'2026-10-04T23:00:00.000Z',area:{label:'Kauman, Kota Malang'},publicUrl:incidentPublicUrl(origin,id)};

test('public incident URL uses configured origin and canonical report, not a scan or social post',()=>{
 assert.equal(incidentPublicUrl(`${origin}/deployment`,id),`${origin}/incidents/${id}`);
 assert.equal(incidentPublicUrl(origin,'unsafe/alias'),`${origin}/incidents/unsafe%2Falias`);
});
test('caption retains user summary and adds safe area, Jakarta observation date and correction link exactly once',()=>{
 const caption=publicationCaption('Foto warga, belum ditangani.',source);
 assert.match(caption,/Laporan warga · bukti ditinjau moderator/);
 assert.match(caption,/Pengamatan: 5 Okt 2026 · Kauman, Kota Malang/);
 assert.ok(caption.endsWith(source.publicUrl));
 assert.equal(publicationCaption(caption,source),caption);
 assert.match(publicationCaption(caption,{...source,occurredAt:'2026-10-06T00:00:00Z'}),/6 Okt 2026/);
});
test('older previews or captions missing current canonical context cannot be approved for publication',()=>{
 const post={source_snapshot:source,caption:publicationCaption('Sampah terlihat.',source),template_version:'vergo-feed-status-v4'};
 assert.equal(publicationContextReady(post,origin),true);
 assert.equal(publicationContextReady({...post,template_version:'sap-feed-reference-v3'},origin),false);
 assert.equal(publicationContextReady({...post,caption:'Tanpa tautan'},origin),false);
 assert.equal(publicationContextReady(post,'https://other.example'),false);
 assert.equal(publicationContextReady({...post,source_snapshot:{...source,occurredAt:'invalid'}},origin),false);
});
test('source correction flags previously published material without claiming Instagram was updated or deleted',()=>{
 const post={source_revision:2,published_at:'2026-10-04',status:'published'};
 const update=sourceUpdateState(post,{revision:3,status:'resolved'},false,source.publicUrl);
 assert.equal(update.changed,true);
 assert.equal(update.followUpRequired,true);
 assert.equal(update.reason,'SOURCE_REVISION_CHANGED');
 assert.equal(update.currentStatus,'resolved');
 assert.equal(sourceUpdateState({...post,published_at:null},{revision:3,status:'resolved'},false,source.publicUrl).followUpRequired,false);
 assert.equal(sourceUpdateState({...post,status:'retracted'},{revision:3,status:'resolved'},false,source.publicUrl).followUpRequired,false);
});
test('revoked media or publication eligibility flags live material even when report revision is unchanged',()=>{
 const post={source_revision:2,published_at:'2026-10-04',status:'retracting'};
 assert.equal(sourceUpdateState(post,{revision:2,status:'verified'},false,source.publicUrl).reason,'SOURCE_NOT_APPROVED');
 assert.equal(sourceUpdateState(post,{revision:2,status:'verified'},false,source.publicUrl).followUpRequired,true);
 assert.equal(sourceUpdateState(post,{revision:2,status:'verified'},true,source.publicUrl).followUpRequired,false);
});
