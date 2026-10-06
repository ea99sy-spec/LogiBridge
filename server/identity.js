import { scrypt, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import {cloudEnabled,cloudVaultKey} from './cloud-store.js';
const derive = promisify(scrypt);
let documentKey;
export async function initializeVault(directory) {
  if(cloudEnabled()){documentKey=await cloudVaultKey();if(documentKey.length!==32)throw new Error('Invalid cloud verification key');return}
  const file = new URL('.verification.key', directory);
  try { documentKey = await readFile(file); }
  catch(error) {
    if(error.code !== 'ENOENT') throw error;
    documentKey=randomBytes(32);
    await writeFile(file,documentKey,{flag:'wx',mode:0o600});
  }
  if(documentKey.length!==32)throw new Error('Invalid verification storage key');
}
export function encryptDocument(base64) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',documentKey,iv);
  const content=Buffer.concat([cipher.update(Buffer.from(base64,'base64')),cipher.final()]);
  return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:content.toString('base64')};
}
export function decryptDocument(encrypted) {
  const decipher=createDecipheriv('aes-256-gcm',documentKey,Buffer.from(encrypted.iv,'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted.data,'base64')),decipher.final()]);
}
export async function hashPassword(password) {
  if(typeof password!=='string'||password.length<12||password.length>128)throw new Error('Password must contain 12 to 128 characters');
  const salt=randomBytes(16).toString('hex');
  return {salt,hash:(await derive(password,salt,64)).toString('hex')};
}
export async function checkPassword(password,credential) {
  if(typeof password!=='string'||password.length>128||!credential)return false;
  const value=await derive(password,credential.salt,64),expected=Buffer.from(credential.hash,'hex');
  return expected.length===value.length&&timingSafeEqual(expected,value);
}
export function publicUser(user,own=false) {
  if(!user)return null;
  const {id,role,name,verified,plan,accountType,verificationStatus,verificationLevel,demo}=user;
  return {id,role,name,verified,plan,accountType,verificationStatus,verificationLevel,demo,...(own?{email:user.email,taxId:user.taxId||null}: {})};
}
export function validateDocument(body) {
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(body.content||''))throw new Error('Invalid document');
  const bytes=Buffer.from(body.content,'base64');
  if(bytes.length>2000000||bytes.length<8)throw new Error('Document must be under 2 MB');
  const magic={ 'application/pdf':bytes.subarray(0,5).toString()==='%PDF-', 'image/png':bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a', 'image/jpeg':bytes.subarray(0,3).toString('hex')==='ffd8ff' };
  if(!magic[body.mime])throw new Error('Invalid file type or signature');
}
export function validFutureDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&value>new Date().toISOString().slice(0,10);
}
