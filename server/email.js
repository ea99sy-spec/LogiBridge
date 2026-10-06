import {randomUUID} from 'node:crypto';
const subjects={registered:'استلمنا تسجيلك في LogiBridge',login:'تسجيل دخول إلى حسابك في LogiBridge',approved:'تم قبول حسابك في LogiBridge',rejected:'قرار مراجعة حسابك في LogiBridge',application:'اكتمل تقديم طلب التوثيق',shipment_submitted:'استلمنا طلب شحنك',bid_received:'وصل عرض جديد لشحنتك',company_joined:'شركة جديدة وخدماتها في LogiBridge',message_received:'وصلتك رسالة من حساب آخر في LogiBridge'};
export function queueEmail(s,userId,event,details={},key){
  const u=s.users.find(x=>x.id===userId);if(!u||u.demo||u.role==='admin'||!u.email||!subjects[event])return;
  if(event==='company_joined'&&u.profile?.companyEmails===false)return;
  s.emailOutbox||=[];if(key&&s.emailOutbox.some(x=>x.key===key))return;
  const url=(process.env.URL||process.env.SITE_URL||'https://logibridge-ea99sy.netlify.app').replace(/\/$/,'');
  const lines={registered:'استلمنا تسجيلك. حسابات الشركات تحتاج موافقة المسؤول. أكمل بياناتك ووثائقك من صفحة التوثيق، وسنقيّم الطلب ونرد بالبريد الإلكتروني.',login:'تم تسجيل دخول ناجح إلى حسابك. إذا لم تكن أنت، غيّر كلمة المرور وتواصل مع إدارة المنصة.',approved:'وافق المسؤول على حسابك. يمكنك الآن استخدام خدمات المنصة.',rejected:'لم تتم الموافقة على طلبك. يمكنك مراجعة السبب واستكمال المستندات وإعادة تقديم الطلب.',application:'اكتمل تقديم طلبك والملفات. الطلب الآن قيد التقييم وسنرسل القرار بالبريد الإلكتروني.',shipment_submitted:'اكتمل تقديم طلب الشحنة. يمكنك رفع ملفات إضافية من مركز الوثائق. عند وصول عروض النقل سنرسل إشعارًا بالبريد الإلكتروني.',bid_received:'وصل عرض نقل جديد. افتح الشحنة للاطلاع على السعر وشروط العرض.',company_joined:'انضمت شركة معتمدة إلى المنصة. يمكنك الاطلاع على تعريفها وخدماتها والتواصل معها داخل الموقع.',message_received:'وصلتك رسالة جديدة من حساب آخر. افتح مركز التواصل للرد.'};
  const info=Object.values(details).filter(v=>typeof v==='string'&&v).join('\n');
  s.emailOutbox.push({id:randomUUID(),key,to:u.email,userId,event,subject:subjects[event],text:`مرحبًا ${u.name}،\n\n${lines[event]}\n${info}\n\n${url}/workspace/${event==='company_joined'?'directory':event==='message_received'?'hub':event==='bid_received'?'shipments':'dashboard'}\n\nLogiBridge${event==='company_joined'?'\nيمكنك إيقاف رسائل الشركات الجديدة من إعدادات ملفك الشخصي.':''}`,status:'pending',attempts:0,createdAt:new Date().toISOString()});
}
export const mailConfigured=()=>!!(process.env.RESEND_API_KEY&&process.env.MAIL_FROM);
export async function deliverEmail(job,fetcher=fetch){
  if(!mailConfigured())return {configured:false};
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`logibridge/${job.id}`},body:JSON.stringify({from:process.env.MAIL_FROM,to:[job.to],subject:job.subject,text:job.text,...(process.env.MAIL_REPLY_TO?{reply_to:process.env.MAIL_REPLY_TO}:{})}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error(`Email provider returned ${response.status}`);const value=await response.json();if(!value.id)throw Error('Email provider did not acknowledge the message');return {configured:true,providerId:value.id};
}
export async function flushEmails(limit=3){
  if(!mailConfigured())return {configured:false,sent:0};const {readState,mutate}=await import('./store.js');let sent=0;
  for(let i=0;i<limit;i++){
    const job=await mutate(s=>{const now=Date.now(),p=(s.emailOutbox||[]).find(x=>x.status==='pending'&&(!x.nextAttempt||Date.parse(x.nextAttempt)<=now)||x.status==='sending'&&Date.parse(x.leaseUntil)<now);if(!p)return null;p.status='sending';p.leaseUntil=new Date(now+120000).toISOString();p.attempts++;return p});if(!job)break;
    try{const result=await deliverEmail(job);await mutate(s=>{const p=s.emailOutbox.find(x=>x.id===job.id);p.status='sent';p.providerId=result.providerId;p.sentAt=new Date().toISOString();delete p.leaseUntil;delete p.lastError});sent++}
    catch(error){await mutate(s=>{const p=s.emailOutbox.find(x=>x.id===job.id);p.status=p.attempts>=5?'failed':'pending';p.lastError=error.message;p.nextAttempt=new Date(Date.now()+Math.min(3600000,60000*2**p.attempts)).toISOString();delete p.leaseUntil})}
  }return {configured:true,sent};
}
