import {requiresApproval} from './access.js';
const modules={
  merchant:['dashboard','profile','directory','newShipment','shipments','documents','tracking','groups','customs','hub','kyb','border','ratings','marketplace','contracts','reports','integrations'],
  individual:['dashboard','profile','directory','newShipment','shipments','tracking','groups','documents','kyb','hub','customs','ratings','marketplace','contracts'],
  carrier:['dashboard','profile','directory','jobs','fleet','groups','tracking','documents','hub','kyb','border','ratings','marketplace','contracts','drivers','reports'],
  supplier:['dashboard','profile','directory','inventory','orders','calendar','hub','kyb'],
  admin:['dashboard','admin','companies','kyb','shipments','tracking','documents','hub']
};
export function accountKind(user){return user.role==='admin'?'admin':user.accountType==='individual'?'individual':user.role}
export function workspaceModules(user,flags={}){if(requiresApproval(user))return ['dashboard','profile','kyb'];return (modules[accountKind(user)]||[]).filter(key=>!['ratings','marketplace','contracts'].includes(key)||flags[key]).filter(key=>!['inventory','orders'].includes(key)||flags.marketplace)}
export function visibleShipments(state,user){return state.shipments.filter(s=>user.role==='admin'||user.role==='carrier'&&(s.status==='open'||s.carrierId===user.id)||user.role==='merchant'&&s.ownerId===user.id)}
export function vendorOrders(state,user){return state.orders.filter(o=>user.role==='admin'||o.userId===user.id||user.role==='supplier'&&state.products.some(p=>p.id===o.productId&&p.supplierId===user.id))}
