import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {initialize,readState,mutate} from '../server/store.js';
import {hashPassword} from '../server/identity.js';
await initialize();
if(readState().users.some(u=>u.id==='platform-admin')){console.log('Administrator already exists; existing credentials unchanged.');process.exit(0)}
const email='owner@logibridge.local',password=randomBytes(20).toString('base64url'),credential=await hashPassword(password);
const file=new URL('../data/admin-access.txt',import.meta.url);
await writeFile(file,`LogiBridge administrator\nLogin: http://localhost:3000/login/admin\nEmail: ${email}\nPassword: ${password}\nKeep this file private. This password works only on this local installation.\n`,{flag:'wx',mode:0o600});
await mutate(s=>s.users.push({id:'platform-admin',role:'admin',accountType:'admin',name:'LogiBridge Owner',email,credential,demo:false,verified:false,verificationStatus:'not_submitted',verificationLevel:'none',plan:'pro'}));
console.log('Administrator created. Credentials saved in data/admin-access.txt (password not printed).');
