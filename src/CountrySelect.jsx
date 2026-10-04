import React,{useMemo,useState} from 'react';
import {countryOptions} from '../shared/countries';
export default function CountrySelect({t,label,name='country',disabled=false}){
  const [search,setSearch]=useState(''),[value,setValue]=useState('');
  const lang=document.documentElement.lang||'ar';
  const options=useMemo(()=>countryOptions(lang),[lang]);
  const matches=options.filter(o=>o.code===value||`${o.label} ${o.code}`.toLocaleLowerCase(lang).includes(search.toLocaleLowerCase(lang)));
  return <div className="field country-picker"><span>{t(label)}</span><input type="search" aria-label={t('searchCountry')} placeholder={t('searchCountry')} value={search} onChange={e=>setSearch(e.target.value)} disabled={disabled}/><select aria-label={t(label)} name={name} value={value} onChange={e=>setValue(e.target.value)} required disabled={disabled}><option value="">{t('chooseCountry')}</option>{matches.map(o=><option value={o.code} key={o.code}>{o.label} ({o.code})</option>)}</select><small>{t('internationalCountries')}</small></div>
}
