import {queueEmail} from './email.js';
import {publicUser,validateDocument,encryptDocument,decryptDocument} from './identity.js';
import {readState,mutate,id} from './store.js';
const text=(value,max=300)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid text');return value.trim()};
const canSee=(user,shipment)=>user.role==='admin'||[shipment.ownerId,shipment.carrierId].includes(user.id);
export function operationRoutes(app){
  app.patch('/api/orders/:id/status',async(req,res)=>{
    if(req.user.role!=='supplier')return res.status(403).json({error:'Forbidden'});
    await mutate(s=>{if(!s.flags.marketplace)throw new Error('Feature disabled');const order=s.orders.find(o=>o.id===req.params.id),product=s.products.find(p=>p.id===order?.productId);if(!order||product?.supplierId!==req.user.id)throw new Error('Order unavailable');const allowed={demo_reserved:['confirmed','cancelled'],confirmed:['completed','cancelled']};if(!allowed[order.status]?.includes(req.body.status))throw new Error('Invalid order transition');order.status=req.body.status;order.updatedAt=new Date().toISOString()});res.json({ok:true});
  });
  app.get('/api/admin/accounts',(req,res)=>{
    if(req.user.role!=='admin')return res.status(403).json({error:'Forbidden'});
    const s=readState();res.json(s.users.filter(u=>u.role!=='admin').map(u=>({...publicUser(u),...(!req.user.demo||u.demo?{email:u.email}:{}),shipmentCount:s.shipments.filter(sh=>sh.ownerId===u.id||sh.carrierId===u.id).length,applicationCount:s.kyb.filter(d=>d.userId===u.id&&(!req.user.demo||u.demo)).length})));
  });
  app.get('/api/admin/accounts/:id',(req,res)=>{
    if(req.user.role!=='admin')return res.status(403).json({error:'Forbidden'});
    const s=readState(),account=s.users.find(u=>u.id===req.params.id&&u.role!=='admin');
    if(!account)return res.sendStatus(404);
    if(req.user.demo&&!account.demo)return res.status(403).json({error:'A registered administrator is required'});
    res.json({account:publicUser(account,true),applications:s.kyb.filter(d=>d.userId===account.id).map(({encryptedContent,content,...d})=>d),shipments:s.shipments.filter(sh=>[sh.ownerId,sh.carrierId].includes(account.id)).map(({privateDetails,...sh})=>sh)});
  });
  app.post('/api/shipments/:id/submit',async(req,res)=>{await mutate(s=>{const sh=s.shipments.find(x=>x.id===req.params.id&&x.ownerId===req.user.id);if(!sh)throw Error('Shipment unavailable');if(sh.submittedAt)return;if(!s.shipmentDocuments.some(d=>d.shipmentId===sh.id))throw Error('Upload shipment documents first');sh.submittedAt=new Date().toISOString();queueEmail(s,req.user.id,'shipment_submitted',{shipment:sh.title},`shipment/${sh.id}`)});res.json({ok:true,completed:true})});
  app.post('/api/shipment-documents',async(req,res)=>{
    const b=req.body;validateDocument(b);
    if(!['invoice','packing','origin','transport','customs','other'].includes(b.kind))throw new Error('Invalid document kind');
    await mutate(s=>{const sh=s.shipments.find(x=>x.id===b.shipmentId);if(!sh||![sh.ownerId,sh.carrierId].includes(req.user.id))throw new Error('Shipment unavailable');s.shipmentDocuments.push({id:id(),shipmentId:sh.id,userId:req.user.id,kind:b.kind,filename:text(b.filename),mime:b.mime,encryptedContent:encryptDocument(b.content),createdAt:new Date().toISOString()})});res.status(201).json({ok:true});
  });
  app.get('/api/shipment-documents/:id', (req,res)=>{
    const s=readState(),doc=s.shipmentDocuments.find(x=>x.id===req.params.id),sh=s.shipments.find(x=>x.id===doc?.shipmentId);
    if(!doc||!sh)return res.sendStatus(404);
    if(!canSee(req.user,sh)||req.user.demo&&!s.users.find(u=>u.id===doc.userId)?.demo)return res.sendStatus(403);
    res.set('Content-Type',doc.mime).set('Content-Disposition','attachment; filename="shipment-document"');res.send(decryptDocument(doc.encryptedContent));
  });
  app.post('/api/shipments/:id/location',async(req,res)=>{
    await mutate(s=>{const sh=s.shipments.find(x=>x.id===req.params.id);if(!sh||req.user.id!==sh.carrierId||!['assigned','transit','arrived'].includes(sh.status))throw new Error('Assigned carrier required');
      const location=text(req.body.location,120),note=text(req.body.note,500);
      s.trackingEvents.push({id:id(),shipmentId:sh.id,actorId:req.user.id,event:'location_update',location,note,source:'carrier_manual',createdAt:new Date().toISOString()});sh.lastLocation=location;
    });res.json({ok:true});
  });
}
