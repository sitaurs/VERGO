import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { appealBody, policyBody } from '../src/trust/trust.service.js';

function errorCode(error: unknown): string {
  const body=(error as HttpException).getResponse?.();
  return typeof body==='object'&&body!==null?(body as {code?:string}).code??'':'';
}

const MEDIA='11111111-1111-4111-8111-111111111111';

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
