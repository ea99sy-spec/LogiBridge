import express from 'express';
import { randomBytes } from 'node:crypto';
import { createClient } from 'redis';
import { initialize, readState, mutate, id } from './store.js';
import { acceptBid, reserveGroup, transitionShipment, optionalFeatures, positive, crossingDocuments } from './domain.js';
import { hashPassword, checkPassword, publicUser, validateDocument, encryptDocument, decryptDocument, validFutureDate } from './identity.js';
import { validCountry } from '../shared/countries.js';
import { operationRoutes } from './operations.js';
import {routeDetails} from '../shared/routes.js';
import {visibleShipments,vendorOrders} from '../shared/workspaces.js';
import {advancedRoutes,publicAdvancedRoutes,advancedState,integrationAuth,notice,shipmentNotice,matchRoutes} from './advanced.js';

import {cloudEnabled,writeSession,readSession,deleteSession} from './cloud-store.js';
import {paymentRoutes,paymentState} from './payments.js';
export async function createApp(){
await initialize();
const app = express(); const sessions = new Map();
if(process.env.LOGIBRIDGE_SERVERLESS==='true')app.set('trust proxy',1);
const DEMO = process.env.DEMO_MODE !== 'false';
let redis;
if (process.env.REDIS_URL) { redis = createClient({ url: process.env.REDIS_URL }); redis.on('error', e => console.error('Redis:', e.message)); await redis.connect(); }
app.use(express.json({ limit: '4mb' }));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Cache-Control', 'no-store'); next(); });
app.use('/api',(req,res,next)=>{if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==`${req.protocol}://${req.get('host')}`)return res.status(403).json({error:'Origin rejected'});next()});
const authAttempts=new Map();
function authLimit(req,res,next){const key=req.ip,now=Date.now(),entry=authAttempts.get(key);if(!entry||entry.until<now)authAttempts.set(key,{count:1,until:now+600000});else if(++entry.count>30)return res.status(429).json({error:'Too many attempts. Try again later.'});if(authAttempts.size>10000)for(const[k,v]of authAttempts)if(v.until<now)authAttempts.delete(k);next()}
const txt = (v, max = 300) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Invalid text'); return v.trim(); };
const role = (user, ...roles) => { if (!roles.includes(user.role)) { const e = new Error('Forbidden'); e.status = 403; throw e; } };
const enabled = (state, key) => { if (!state.flags[key]) throw new Error('Feature disabled'); };
function notify(state, shipment, event) { shipmentNotice(state,shipment,event); }
app.get('/api/health', (req, res) => res.json({ ok: true, demo: DEMO, storage:cloudEnabled()?'netlify-blobs':process.env.DATABASE_URL ? 'postgresql' : 'json', redis: !!redis }));
async function sessionFor(user,res){const token=randomBytes(32).toString('hex'),expiry=Date.now()+86400000;const value={userId:user.id,expiry};if(cloudEnabled())await writeSession(token,value);else if(redis)await redis.set(`session:${token}`,JSON.stringify(value),{EX:86400});else sessions.set(token,value);res.cookie('lb_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',maxAge:86400000});res.json({user:publicUser(user,true)})}
app.post('/api/auth/register',authLimit,async(req,res)=>{
  const b=req.body;
  if(!['merchant','carrier','supplier','individual'].includes(b.accountType))throw new Error('Invalid account type');
  const email=txt(b.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email');
  const credential=await hashPassword(b.password);
  const taxId=b.accountType==='individual'?null:txt(b.taxId,40);
  if(taxId&&!/^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,39}$/.test(taxId))throw new Error('Invalid company tax number');
  const user={id:id(),role:b.accountType==='individual'?'merchant':b.accountType,accountType:b.accountType,name:txt(b.name,120),taxId,email,credential,verified:false,verificationStatus:'not_submitted',verificationLevel:'none',plan:'free',demo:false};
  await mutate(s=>{if(s.users.some(u=>u.email===email))throw new Error('Email already registered');s.users.push(user);for(const a of s.users.filter(u=>u.role==='admin'&&!u.demo))notice(s,a.id,'account_registered')});
  await sessionFor(user,res);
});
app.post('/api/auth/login',authLimit,async(req,res)=>{
  const user=readState().users.find(u=>u.email===String(req.body.email||'').trim().toLowerCase()&&!u.demo);
  if(!user||user.accountType!==req.body.accountType||!await checkPassword(req.body.password,user.credential))return res.status(401).json({error:'Invalid credentials or account type'});
  await sessionFor(user,res);
});
app.post('/api/login', async (req, res) => {
  if (!DEMO) return res.status(503).json({ error: 'Demo login disabled. Connect an identity provider before deployment.' });
  const user = readState().users.find(u => u.id === req.body.userId && u.demo);
  if (!user) return res.status(400).json({ error: 'Unknown demo account' });
  const token = randomBytes(32).toString('hex'), expiry = Date.now() + 86400000;
  if(cloudEnabled())await writeSession(token,{userId:user.id,expiry});else if (redis) await redis.set(`session:${token}`, JSON.stringify({ userId: user.id, expiry }), { EX: 86400 });
  else sessions.set(token, { userId: user.id, expiry });
  res.cookie('lb_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: 86400000 });
  res.json({ user:publicUser(user,true) });
});
publicAdvancedRoutes(app);
app.use('/api', async (req, res, next) => {
  if(req.path==='/v1/shipments')return integrationAuth(req,res,next);
  const token = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('lb_session='))?.slice(11);
  let session = token && (cloudEnabled()?await readSession(token):redis ? JSON.parse(await redis.get(`session:${token}`) || 'null') : sessions.get(token));
  if (!session || session.expiry < Date.now()) return res.status(401).json({ error: 'Sign in required' });
  if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Origin rejected' });
  req.user = readState().users.find(u => u.id === session.userId);
  if(!req.user||!DEMO&&req.user.demo)return res.status(401).json({error:'Sign in required'});
  next();
});
app.post('/api/logout', async (req, res) => { const token = req.headers.cookie?.match(/lb_session=([^;]+)/)?.[1]; if(cloudEnabled()&&token)await deleteSession(token);else if (redis && token) await redis.del(`session:${token}`); else sessions.delete(token); res.clearCookie('lb_session'); res.json({ ok: true }); });
app.get('/api/state', (req, res) => {
  const s = readState(), admin = req.user.role === 'admin';
  const mayReview=x=>admin&&(!req.user.demo||s.users.find(u=>u.id===x.userId)?.demo);
  const visibleShipment=id=>s.shipments.some(sh=>sh.id===id&&(admin||[sh.ownerId,sh.carrierId].includes(req.user.id)));
  res.json({ ...s, realtime:!cloudEnabled(), ...advancedState(s,req.user), ...paymentState(s,req.user), shipments:visibleShipments(s,req.user).map(sh=>{const {privateDetails,...publicShipment}=sh;return admin||[sh.ownerId,sh.carrierId].includes(req.user.id)?sh:publicShipment}),shipmentDocuments:s.shipmentDocuments.filter(d=>visibleShipment(d.shipmentId)&&(!req.user.demo||s.users.find(u=>u.id===d.userId)?.demo)).map(({encryptedContent,...doc})=>doc),trackingEvents:s.trackingEvents.filter(e=>visibleShipment(e.shipmentId)), users:s.users.map(u=>publicUser(u)), user: publicUser(req.user,true), demo: DEMO, kyb: s.kyb.filter(x => mayReview(x) || x.userId === req.user.id).map(({ content, encryptedContent, ...x }) => x), bids: s.bids.filter(b => admin || b.carrierId === req.user.id || s.shipments.some(sh => sh.id === b.shipmentId && sh.ownerId === req.user.id)), messages: s.messages.filter(m => m.senderId === req.user.id || m.recipientId === req.user.id), escrows: s.escrows.filter(e => admin || s.shipments.some(sh => sh.id === e.shipmentId && [sh.ownerId, sh.carrierId].includes(req.user.id))), reservations:s.reservations.filter(x=>admin||x.userId===req.user.id||req.user.role==='carrier'&&s.groups.some(g=>g.id===x.groupId&&g.carrierId===req.user.id)), orders:vendorOrders(s,req.user), contracts: s.contracts.filter(x => admin || s.shipments.some(sh => sh.id === x.shipmentId && [sh.ownerId, sh.carrierId].includes(req.user.id))), notifications: s.notifications.filter(x => x.userId === req.user.id), checklists: s.checklists[req.user.id] || {} });
});
operationRoutes(app);
paymentRoutes(app);
advancedRoutes(app);
app.post(['/api/shipments','/api/v1/shipments'], async (req, res) => {
  role(req.user, 'merchant'); const b = req.body; const route=routeDetails(b);
  const hsCode = b.hsCode == null ? '' : String(b.hsCode).trim();
  if(!/^[0-9]{6,12}$/.test(hsCode)) throw new Error('HS Code is required and must contain 6 to 12 digits');
  if (!['textiles','food','machinery','packaging','other'].includes(b.category) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !Number.isFinite(Date.parse(b.date)) || b.date < new Date().toISOString().slice(0,10)) throw new Error('Invalid shipment details');
  if((b.originCountry&&!validCountry(b.originCountry))||(b.destinationCountry&&!validCountry(b.destinationCountry)))throw new Error('Invalid route country');
  const privateDetails=b.senderName?{senderName:txt(b.senderName,120),recipientName:txt(b.recipientName,120),phone:txt(b.phone,40),destinationAddress:txt(b.destinationAddress,300)}:null;
  const shipment = { id: id(), ownerId: req.user.id, title: txt(b.title), origin: txt(b.origin, 80), destination: txt(b.destination, 80),...route,description:b.description?txt(b.description,2000):'',hsCode,insuranceRequested:b.insuranceRequested===true||b.insuranceRequested==='on',insuranceStatus:(b.insuranceRequested===true||b.insuranceRequested==='on')?'requested':'not_requested',privateDetails, category: b.category, volume: positive(b.volume, 'volume'), weight: positive(b.weight, 'weight'), date: b.date, status: 'open', createdAt: new Date().toISOString() };
  const created=await mutate(s => {if(req.path==='/api/v1/shipments'){const requestKey=req.get('Idempotency-Key');if(requestKey){if(!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey))throw Error('Invalid Idempotency-Key');const old=s.shipments.find(x=>x.ownerId===req.user.id&&x.integrationKey===requestKey);if(old)return old;shipment.integrationKey=requestKey}}s.shipments.push(shipment);matchRoutes(s,shipment);s.trackingEvents.push({id:id(),shipmentId:shipment.id,actorId:req.user.id,event:'open',source:'platform',createdAt:shipment.createdAt});return shipment}); res.status(201).json(created);
});
app.post('/api/bids', async (req, res) => {
  role(req.user, 'carrier'); const b = req.body;
  await mutate(s => { if (!s.shipments.some(x => x.id === b.shipmentId && x.status === 'open')) throw new Error('Shipment closed'); if (s.bids.some(x => x.shipmentId === b.shipmentId && x.carrierId === req.user.id)) throw new Error('You already submitted an offer'); notice(s,s.shipments.find(x=>x.id===b.shipmentId).ownerId,'bid_received',b.shipmentId);s.bids.push({ id: id(), shipmentId: b.shipmentId, carrierId: req.user.id, price: positive(b.price, 'price'), days: positive(b.days, 'days'), note: txt(b.note), createdAt: new Date().toISOString() }); });
  res.status(201).json({ ok: true });
});
app.post('/api/shipments/:id/accept', async (req, res) => { role(req.user, 'merchant'); const sh = await mutate(s => {const sh=acceptBid(s, req.params.id, req.body.bidId, req.user.id);s.trackingEvents.push({id:id(),shipmentId:sh.id,actorId:req.user.id,event:'assigned',source:'platform',createdAt:new Date().toISOString()});shipmentNotice(s,sh,'assigned');return sh}); res.json(sh); });
app.post('/api/shipments/:id/action', async (req, res) => {
  if(req.body.action==='fund'&&!req.user.demo)return res.status(400).json({error:'Submit a bank payment receipt; administrator confirmation is required'});
  await mutate(s => { const sh = s.shipments.find(x => x.id === req.params.id); if (!sh) throw new Error('Unknown shipment'); transitionShipment(s, sh, req.body.action, req.user);s.trackingEvents.push({id:id(),shipmentId:sh.id,actorId:req.user.id,event:req.body.action,source:'platform',createdAt:new Date().toISOString()}); notify(s, sh, req.body.action); }); res.json({ ok: true });
});
app.post('/api/groups/:id/reserve', async (req, res) => {
  role(req.user, 'merchant'); const result = await mutate(s => { const g = s.groups.find(x => x.id === req.params.id); if (!g) throw new Error('Unknown group'); const r = { id: id(), groupId: g.id, userId: req.user.id, ...reserveGroup(g, req.body.volume) }; s.reservations.push(r); return r; }); res.status(201).json(result);
});
app.patch('/api/flags', async (req, res) => { role(req.user, 'admin'); await mutate(s => { for (const [k, v] of Object.entries(req.body)) { if (!optionalFeatures.includes(k) || typeof v !== 'boolean') throw new Error('Invalid feature'); s.flags[k] = v; } }); res.json({ ok: true }); });
app.post('/api/checklist', async (req, res) => { const { crossing, key, checked } = req.body; if (!crossingDocuments[crossing]?.includes(key) || typeof checked !== 'boolean') throw new Error('Invalid document'); await mutate(s => { s.checklists[req.user.id] ||= {}; s.checklists[req.user.id][`${crossing}:${key}`] = checked; }); res.json({ ok: true }); });
app.post('/api/fleets', async(req,res)=>{role(req.user,'carrier');const b=req.body;await mutate(s=>{s.fleets ||= [];s.fleets.push({id:id(),userId:req.user.id,name:txt(b.name,80),capacity:positive(b.capacity,'capacity')})});res.json({ok:true})});
app.post('/api/groups', async(req,res)=>{role(req.user,'carrier');const b=req.body;const route=routeDetails({...b,crossing:b.crossing||(!b.transportType?'bab':undefined)});if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||b.date<new Date().toISOString().slice(0,10))throw new Error('Invalid departure date');await mutate(s=>{s.groups.push({id:id(),carrierId:req.user.id,...route,origin:txt(b.origin,80),destination:txt(b.destination,80),capacity:positive(b.capacity,'capacity'),booked:0,pricePerM3:positive(b.pricePerM3,'price'),date:b.date});for(const sh of s.shipments.filter(x=>x.status==='open'))matchRoutes(s,sh)});res.json({ok:true})});
app.post('/api/plan',async(req,res)=>{if(!['free','pro'].includes(req.body.plan))throw new Error('Invalid plan');await mutate(s=>{s.users.find(u=>u.id===req.user.id).plan=req.body.plan});res.json({ok:true,simulated:true})});
app.post('/api/products',async(req,res)=>{role(req.user,'supplier');await mutate(s=>{enabled(s,'marketplace');if(!['sale','rental'].includes(req.body.type))throw new Error('Invalid listing type');s.products.push({id:id(),supplierId:req.user.id,title:txt(req.body.title,80),price:positive(req.body.price,'price'),type:req.body.type})});res.json({ok:true})});
app.post('/api/kyb', async (req, res) => {
  role(req.user,'merchant','carrier','supplier');
  const b=req.body;validateDocument(b);const person=req.user.accountType==='individual';
  if(!validCountry(b.country)&&!(req.user.demo&&!b.country))throw new Error('Valid country required');
  if(person&&!validFutureDate(b.expiry))throw new Error('Valid passport expiry required');
  const details=person?{fullName:txt(b.fullName,120),passportLast4:txt(b.passportNumber,40).slice(-4),expiry:b.expiry}:{company:txt(b.company),registration:txt(b.registration,80),registry:txt(b.registry|| (req.user.demo?'Demo registry':''),120)};
  if(!person){details.taxId=txt(b.taxId||req.user.taxId||(req.user.demo?'DEMO-TAX':''),40);if(!/^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,39}$/.test(details.taxId))throw new Error('Invalid company tax number')}
  await mutate(s=>{if(s.kyb.some(x=>x.userId===req.user.id&&x.status==='pending'))throw new Error('Application pending');s.kyb.push({id:id(),userId:req.user.id,kind:person?'person':'company',country:b.country||'TR',...details,filename:txt(b.filename),mime:b.mime,encryptedContent:encryptDocument(b.content),status:'pending',createdAt:new Date().toISOString()});const u=s.users.find(u=>u.id===req.user.id);u.verified=false;u.verificationStatus='pending';u.verificationLevel='none'});res.json({ok:true});
});
app.get('/api/kyb/:id/document', (req, res) => { role(req.user,'admin'); const doc = readState().kyb.find(x => x.id === req.params.id); if (!doc) return res.sendStatus(404); if(req.user.demo&&!readState().users.find(u=>u.id===doc.userId)?.demo)return res.sendStatus(403); res.set('Content-Type',doc.mime); res.set('Content-Disposition','attachment; filename="verification-document"'); res.send(decryptDocument(doc.encryptedContent)); });
app.post('/api/kyb/:id/review', async (req, res) => { role(req.user, 'admin'); if (!['approved','rejected'].includes(req.body.status)) throw new Error('Invalid review'); await mutate(s => {
  const doc = s.kyb.find(x => x.id === req.params.id && x.status === 'pending'); if (!doc) throw new Error('Application unavailable');
  const owner=s.users.find(u=>u.id===doc.userId),b=req.body;
  if(req.user.demo&&!owner.demo){const error=new Error('A registered administrator is required');error.status=403;throw error}
  if(b.status==='approved'&&!owner.demo){if(b.documentMatches!==true)throw new Error('Document review required');if(doc.kind==='company'&&(b.registryMatches!==true||b.businessActive!==true||!b.reference))throw new Error('Official registry review and reference required');if(doc.kind==='person'&&(!validFutureDate(doc.expiry)||b.passportMatches!==true))throw new Error('Passport review required')}
  if(b.status==='rejected'&&!owner.demo&&!b.reason)throw new Error('Rejection reason required');
  doc.status=b.status;doc.review={reviewerId:req.user.id,reviewedAt:new Date().toISOString(),reference:b.reference?txt(b.reference,500):null,reason:b.reason?txt(b.reason,500):null,documentMatches:b.documentMatches===true,registryMatches:b.registryMatches===true,businessActive:b.businessActive===true,passportMatches:b.passportMatches===true};
  notice(s,owner.id,'verification_'+b.status);owner.verified=b.status==='approved';owner.verificationStatus=b.status;owner.verificationLevel=owner.verified?(owner.demo?'demo':'manual_review'):'none';
});res.json({ok:true}); });
app.post('/api/messages', async (req, res) => {
  const b = req.body; const message = txt(b.text,2000); if (!readState().users.some(u => u.id === b.recipientId && u.id !== req.user.id)) throw new Error('Invalid recipient');
  const result = await translate(message, b.targetLanguage);
  await mutate(s => s.messages.push({ id: id(), senderId: req.user.id, recipientId: b.recipientId, text: message, translated: result.text, translationMode: result.mode, targetLanguage: b.targetLanguage, createdAt: new Date().toISOString() })); res.json({ ok: true });
});
async function translate(text, lang) {
  if (!['ar','en','tr'].includes(lang)) throw new Error('Invalid language');
  if (!process.env.AI_SERVICE_URL) return { text, mode: 'unavailable' };
  const response = await fetch(`${process.env.AI_SERVICE_URL}/translate`, { method:'POST', headers:{'Content-Type':'application/json','X-Service-Key':process.env.AI_SERVICE_KEY || ''}, body:JSON.stringify({text,language:lang}), signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Translation service unavailable'); return { text:(await response.json()).text, mode:'ai' };
}
app.post('/api/customs', async (req, res) => {
  role(req.user,'merchant');
  const description = txt(req.body.description,1000);
  if (!process.env.AI_SERVICE_URL) return res.json({ mode:'demo', hsCode:null, answer:null, checklist:['invoice','packing','origin','transport','customs'] });
  const response = await fetch(`${process.env.AI_SERVICE_URL}/customs`, { method:'POST', headers:{'Content-Type':'application/json','X-Service-Key':process.env.AI_SERVICE_KEY || ''}, body:JSON.stringify({description,language:req.body.language}), signal:AbortSignal.timeout(20000) }); if (!response.ok) throw new Error('AI service unavailable'); res.json(await response.json());
});
app.post('/api/ratings', async (req, res) => { await mutate(s => { enabled(s,'ratings'); const sh = s.shipments.find(x => x.id === req.body.shipmentId && x.status === 'delivered'); if (!sh || ![sh.ownerId,sh.carrierId].includes(req.user.id)) throw new Error('Delivered shipment required'); const score = Number(req.body.score); if (!Number.isInteger(score) || score<1 || score>5 || s.ratings.some(x => x.shipmentId === sh.id && x.userId === req.user.id)) throw new Error('Invalid or duplicate rating'); s.ratings.push({ id:id(), shipmentId:sh.id, userId:req.user.id, targetId:req.user.id === sh.ownerId ? sh.carrierId : sh.ownerId, score, comment:txt(req.body.comment) }); }); res.json({ok:true}); });
app.post('/api/orders', async (req,res) => { role(req.user,'merchant','carrier');const result = await mutate(s => { enabled(s,'marketplace'); const p=s.products.find(x=>x.id===req.body.productId); if(!p) throw new Error('Unknown product'); if(p.type==='rental')throw new Error('Use dated equipment booking'); const quantity=positive(req.body.quantity,'quantity'); if(!Number.isInteger(quantity) || quantity>1000) throw new Error('Invalid quantity'); const order={id:id(),userId:req.user.id,productId:p.id,quantity,total:quantity*p.price,status:'demo_reserved'}; s.orders.push(order); return order; }); res.json(result); });
app.post('/api/contracts', async(req,res) => { await mutate(s=> { enabled(s,'contracts'); const sh=s.shipments.find(x=>x.id===req.body.shipmentId && x.status!=='open'); if(!sh || ![sh.ownerId,sh.carrierId].includes(req.user.id)) throw new Error('Assigned shipment required'); if(s.contracts.some(x=>x.shipmentId===sh.id && x.userId===req.user.id)) throw new Error('Already acknowledged'); s.contracts.push({id:id(),shipmentId:sh.id,userId:req.user.id,name:txt(req.body.name),createdAt:new Date().toISOString(),type:'demo_acknowledgement'}); }); res.json({ok:true}); });
if(process.env.LOGIBRIDGE_SERVERLESS==='true'){}
else if (process.argv.includes('--production')) { const root=process.cwd().replace(/\\/g,'/')+'/dist/';app.use(express.static(root));app.get(['/accounts','/login/:account','/register/:account','/workspace/:section','/driver'],(req,res)=>res.sendFile(root+'index.html')); }
else { const { createServer } = await import('vite'+String('')); const vite = await createServer({server:{middlewareMode:true},appType:'spa'}); app.use(vite.middlewares); }
app.use((err,req,res,next)=> { console.error(err.message); res.status(err.status || 400).json({error:err.message}); });
return app;
}
const port=Number(process.env.PORT || 3000);
if(process.env.LOGIBRIDGE_SERVERLESS!=='true')createApp().then(app=>app.listen(port, process.env.HOST || '127.0.0.1', ()=>console.log(`LogiBridge: http://localhost:${port} (demo=${process.env.DEMO_MODE!=='false'})`))).catch(error=>{console.error(error.message);process.exitCode=1});
