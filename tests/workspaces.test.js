import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceModules,visibleShipments,vendorOrders} from '../shared/workspaces.js';
const flags={marketplace:true,ratings:true,contracts:true};
test('each account has role-specific modules and feature availability',()=>{
 const carrier=workspaceModules({role:'carrier'},flags),supplier=workspaceModules({role:'supplier'},flags),person=workspaceModules({role:'merchant',accountType:'individual'},flags),admin=workspaceModules({role:'admin'},flags);
 assert.ok(carrier.includes('jobs')&&carrier.includes('fleet'));assert.ok(!carrier.includes('newShipment'));
 assert.ok(supplier.includes('inventory')&&supplier.includes('orders'));for(const k of ['newShipment','tracking','fleet','customs','admin'])assert.ok(!supplier.includes(k));
 assert.ok(person.includes('newShipment')&&person.includes('groups'));assert.ok(!person.includes('fleet')&&!person.includes('companies'));
 assert.ok(admin.includes('companies')&&admin.includes('admin'));assert.ok(!admin.includes('newShipment')&&!admin.includes('inventory'));
 assert.ok(!workspaceModules({role:'supplier'},{marketplace:false}).includes('orders'));
});
test('shipment lists never expose unrelated merchant or individual cargo',()=>{
 const state={shipments:[{id:'own',ownerId:'m',status:'open'},{id:'other',ownerId:'other',status:'open'},{id:'assigned',ownerId:'other',carrierId:'c',status:'transit'}]};
 assert.deepEqual(visibleShipments(state,{id:'m',role:'merchant'}).map(x=>x.id),['own']);
 assert.equal(visibleShipments(state,{id:'s',role:'supplier'}).length,0);
 assert.equal(visibleShipments(state,{id:'c',role:'carrier'}).length,3);
 assert.equal(visibleShipments(state,{id:'a',role:'admin'}).length,3);
});
test('supplier sees only buyer orders for its own equipment',()=>{
 const s={products:[{id:'p',supplierId:'s'},{id:'q',supplierId:'other'}],orders:[{id:'o1',productId:'p',userId:'m'},{id:'o2',productId:'q',userId:'m'}]};
 assert.deepEqual(vendorOrders(s,{id:'s',role:'supplier'}).map(x=>x.id),['o1']);
 assert.equal(vendorOrders(s,{id:'m',role:'merchant'}).length,2);
});
