"use client";
import { useEffect, useState } from 'react';
import { publicTrustPolicy, type TrustPolicy } from '../../lib/api/trust';
import { useI18n } from '../../lib/i18n/provider';
import s from './trust-panels.module.css';

export default function PublicTrustNotice(){
 const {t}=useI18n();const [policy,setPolicy]=useState<TrustPolicy|null>(null);
 useEffect(()=>{const c=new AbortController();publicTrustPolicy(c.signal).then(v=>{if(!c.signal.aborted)setPolicy(v);}).catch(()=>{});return()=>c.abort();},[]);
 if(!policy||![policy.operatorLabel,policy.contactUrl,policy.reviewNotice,policy.retentionNotice].some(Boolean))return null;
 return <aside className={s.notice} aria-label={t('Informasi pengelola dan bukti')}>
  {policy.operatorLabel&&<strong>{policy.operatorLabel}</strong>}
  {policy.reviewNotice&&<p>{policy.reviewNotice}</p>}
  {policy.retentionNotice&&<p>{policy.retentionNotice}</p>}
  {policy.contactUrl&&<a href={policy.contactUrl} target="_blank" rel="noopener noreferrer">{t('Hubungi pengelola')}</a>}
 </aside>;
}
