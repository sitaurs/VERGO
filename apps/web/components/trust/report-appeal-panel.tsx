"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { uploadMedia, type SapReport } from '../../lib/api/client';
import { appealMediaUrl, reportAppeals, submitAppeal, reviseAppeal, type ReportAppeal } from '../../lib/api/trust';
import { r1Error } from '../../lib/api/r1';
import { useIntentKey } from '../activities/activity-ui';
import { useI18n } from '../../lib/i18n/provider';
import s from './trust-panels.module.css';

export const appealStatusLabels={pending:'Menunggu peninjauan',needs_evidence:'Perlu bukti tambahan',accepted:'Diterima untuk ditinjau ulang',rejected:'Permintaan tidak diterima'} as const;
export function AppealEvidence({appealId,ids}:{appealId:string;ids:string[]}){
 const {t}=useI18n();const [urls,setUrls]=useState<string[]>([]),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=new AbortController();setUrls([]);setFailed(false);Promise.all(ids.map(id=>appealMediaUrl(appealId,id,c.signal))).then(items=>{if(!c.signal.aborted)setUrls(items.map(x=>x.url));}).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();},[appealId,ids]);
 return <>{failed&&<p className={s.error}>{t('Foto bukti belum dapat dimuat. Muat ulang sebelum mengambil keputusan.')}</p>}<div className={s.evidence}>{urls.map((url,index)=><a href={url} target="_blank" rel="noopener noreferrer" key={url}><img src={url} alt={t('Bukti privat {0}',{'0':index+1})}/></a>)}</div></>;
}
export default function ReportAppealPanel({report}:{report:SapReport}){
 const {t,intlLocale}=useI18n();const [items,setItems]=useState<ReportAppeal[]>([]),[epoch,setEpoch]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[open,setOpen]=useState(false),[reason,setReason]=useState(''),[editing,setEditing]=useState<ReportAppeal|null>(null),[files,setFiles]=useState<File[]>([]);const uploaded=useRef(new Map<File,string>());const intent=useIntentKey();
 useEffect(()=>{const c=new AbortController();setLoading(true);reportAppeals(report.id,c.signal).then(v=>{if(!c.signal.aborted){setItems(v.items);setError('');}}).catch(e=>{if(!c.signal.aborted)setError(r1Error(e));}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[report.id,report.revision,epoch]);
 const active=items.find(x=>x.status==='pending'||x.status==='needs_evidence');
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{
  const mediaIds=[...(editing?.mediaIds??[])];for(const file of files){let id=uploaded.current.get(file);if(!id){id=(await uploadMedia(file,'report')).id;uploaded.current.set(file,id);}mediaIds.push(id);}if(mediaIds.length>3)throw new Error('Maksimal 3 foto untuk satu permintaan.');
  const body={reason:reason.trim(),mediaIds};const key=intent({body,reportId:report.id,revision:editing?.revision??report.revision});
  if(editing)await reviseAppeal(editing,body,key);else await submitAppeal(report.id,body,report.revision,key);
  setOpen(false);setEditing(null);setFiles([]);setReason('');setNotice('Permintaan peninjauan terkirim. Status laporan belum berubah.');setEpoch(v=>v+1);
 }catch(e){setError(r1Error(e));}finally{setBusy(false);}}
 if(report.status==='submitted'&&!items.length&&!error&&!loading)return null;
 return <section className={s.card}><h3>{t('Peninjauan keputusan')}</h3><p className={s.muted}>{t('Jika keputusan belum sesuai bukti, kirim alasan dan bukti tambahan. Penerimaan permintaan berarti moderator akan meninjau ulang; status laporan tidak berubah otomatis.')}</p>
  {loading&&<p role="status">{t('Memuat permintaan…')}</p>}{error&&<p className={s.error} role="alert">{t(error)}</p>}{notice&&<p className={s.notice} role="status">{t(notice)}</p>}
  {!loading&&!open&&report.status!=='submitted'&&!active&&<button type="button" className={s.secondary} onClick={()=>{setEditing(null);setReason('');setFiles([]);setOpen(true);}}>{t('Ajukan peninjauan keputusan')}</button>}
  {items.map(item=><article className={s.item} key={item.id}><strong className={s.status}>{t(appealStatusLabels[item.status])}</strong><p className={s.muted}>{new Date(item.updatedAt).toLocaleString(intlLocale)} · {t('Revisi laporan saat diajukan')}: {item.sourceRevision}</p><p className={s.pre}>{item.reason}</p>{item.decisionReason&&<p className={s.notice}>{item.decisionReason}</p>}<AppealEvidence appealId={item.id} ids={item.mediaIds}/>{item.status==='needs_evidence'&&!open&&<button type="button" className={s.secondary} onClick={()=>{setEditing(item);setReason(item.reason);setFiles([]);setOpen(true);}}>{t('Lengkapi permintaan')}</button>}</article>)}
  {open&&<form className={s.form} onSubmit={submit}><label className={s.field}>{t('Alasan dan bukti yang perlu dipertimbangkan')}<textarea required minLength={20} maxLength={2000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><label className={s.field}>{t('Foto tambahan untuk pemeriksaan (opsional)')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{const chosen=Array.from(e.target.files??[]);if(chosen.length+(editing?.mediaIds.length??0)>3||chosen.some(f=>f.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type))){setError('Pilih maksimal 3 foto JPG, PNG atau WebP, masing-masing sampai 10 MB.');e.target.value='';return;}setFiles(chosen);}}/><small className={s.muted}>{t('Foto ini hanya untuk pemeriksaan privat, tidak untuk publikasi.')}</small></label><div className={s.actions}><button className={s.button} disabled={busy} type="submit">{t(busy?'Mengirim…':'Kirim permintaan peninjauan')}</button><button className={s.secondary} disabled={busy} type="button" onClick={()=>setOpen(false)}>{t('Batal')}</button></div></form>}
  {error&&<button type="button" className={s.secondary} disabled={busy} onClick={()=>setEpoch(v=>v+1)}>{t('Muat versi terbaru')}</button>}
 </section>;
}
