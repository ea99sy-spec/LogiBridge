import {getStore} from '@netlify/blobs';
export const cloudEnabled=()=>process.env.LOGIBRIDGE_STORAGE==='netlify';
export const cloudStore=name=>getStore({name,consistency:'strong'});
export async function readCloudState(){return cloudStore('logibridge-state').getWithMetadata('state',{type:'json'})}
export async function writeCloudState(value,etag){return cloudStore('logibridge-state').setJSON('state',value,etag?{onlyIfMatch:etag}:{onlyIfNew:true})}
export async function writeSession(token,value){return cloudStore('logibridge-sessions').setJSON(token,value)}
export async function readSession(token){return cloudStore('logibridge-sessions').get(token,{type:'json'})}
export async function deleteSession(token){return cloudStore('logibridge-sessions').delete(token)}
export async function cloudVaultKey(){const store=cloudStore('logibridge-private'),existing=await store.get('document-key',{type:'arrayBuffer'});if(existing)return Buffer.from(existing);const {randomBytes}=await import('node:crypto'),key=randomBytes(32);await store.set('document-key',key.buffer.slice(key.byteOffset,key.byteOffset+key.byteLength),{onlyIfNew:true});const saved=await store.get('document-key',{type:'arrayBuffer'});if(!saved)throw new Error('Cloud document key unavailable');return Buffer.from(saved)}
