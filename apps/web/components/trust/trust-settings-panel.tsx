"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { trustSettings, saveTrustSettings, type TrustPolicy } from '../../lib/api/trust';
import { r1Error } from '../../lib/api/r1';
import { useIntentKey } from '../activities/activity-ui';
import { useI18n } from '../../lib/i18n/provider';
import s from './trust-panels.module.css';

export default function TrustSettingsPanel(){
 const {t}=useI18n();const [policy,setPolicy]=useState<TrustPolicy|null>(null),[epoch,setEpoch]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [operatorLabel,setOperator]=useState(''),[contactUrl,setContact]=useState(''),[reviewNotice,setReview]=useState(''),[retentionNotice,setRetention]=useState('');const intent=useIntentKey();
 useEffect(()=>{const c=new AbortController();trustSettings(c.signal).then(v=>{if(c.signal.aborted)return;setPolicy(v);setOperator(v.operatorLabel??'');setContact(v.contactUrl??'');setReview(v.reviewNotice??'');setRetention(v.retentionNotice??'');setError('');}).catch(e=>{if(!c.signal.aborted)setError(r1Error(e));});return()=>c.abort();},[epoch]);
 async function save(event:FormEvent){event.preventDefault();if(!policy||busy)return;setBusy(true);setError('');setMessage('');const body={operatorLabel:operatorLabel.trim()||null,contactUrl:contactUrl.trim()||null,reviewNotice:reviewNotice.trim()||null,retentionNotice:retentionNotice.trim()||null};try{const v=await saveTrustSettings(body,policy.revision,intent({body,revision:policy.revision}));setPolicy(v);setMessage('Informasi pengelola tersimpan.');}catch(e){setError(r1Error(e));}finally{setBusy(false);}}
 return <section className={s.card}><h2>{t('Informasi layanan dan privasi')}</h2><p className={s.muted}>{t('Opsional untuk pengelola. Isi hanya kebijakan dan kontak yang benar-benar tersedia; bagian kosong tidak ditampilkan kepada publik.')}</p>
  {error&&<p role="alert" className={s.error}>{t(error)}</p>}{message&&<p role="status" className={s.notice}>{t(message)}</p>}
  {!policy?<button className={s.secondary} onClick={()=>setEpoch(v=>v+1)}>{t('Muat ulang informasi')}</button>:<form className={s.form} onSubmit={save}>
   <label className={s.field}>{t('Nama pengelola (opsional)')}<input value={operatorLabel} maxLength={100} disabled={busy} onChange={e=>setOperator(e.target.value)}/></label>
   <label className={s.field}>{t('Tautan bantuan HTTPS (opsional)')}<input type="url" placeholder="https://" value={contactUrl} maxLength={500} disabled={busy} onChange={e=>setContact(e.target.value)}/></label>
   <label className={s.field}>{t('Penjelasan pemeriksaan dan penanganan')}<textarea value={reviewNotice} maxLength={1000} disabled={busy} onChange={e=>setReview(e.target.value)}/></label>
   <label className={s.field}>{t('Penjelasan akses dan masa simpan bukti')}<textarea value={retentionNotice} maxLength={1000} disabled={busy} onChange={e=>setRetention(e.target.value)}/><small className={s.muted}>{t('Teks ini menjelaskan kebijakan yang dijalankan. Mengubah teks tidak mengubah jadwal penghapusan otomatis.')}</small></label>
   <div className={s.actions}><button className={s.button} disabled={busy} type="submit">{t(busy?'Menyimpan…':'Simpan informasi layanan')}</button><button className={s.secondary} type="button" disabled={busy} onClick={()=>setEpoch(v=>v+1)}>{t('Muat versi tersimpan')}</button></div>
  </form>}
 </section>;
}
