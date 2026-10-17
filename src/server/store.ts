import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AIReply, ChatSession, Subscription } from '../lib/types';

import { AppError } from './errors';
export { AppError } from './errors';
export interface Reservation { id:string; fingerprint:string; day:string; sessionId:string; status:'pending'|'success'|'failed'; at:number; reply?:AIReply; }
export interface UserStore { subscription:Subscription; sessions:Record<string,ChatSession>; requests:Record<string,Reservation>; calls:number[]; }
const fresh = ():UserStore=>({ subscription:{status:'free',source:'none',expiresAt:null},sessions:{},requests:{},calls:[] });
export const isProduction=()=>process.env.NODE_ENV==='production';
export const authConfigured=()=>Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
export const databaseConfigured=()=>Boolean(authConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function dbFetch(resource:string, init:RequestInit={}) {
  const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${resource}`,{...init,cache:'no-store',signal:AbortSignal.timeout(10000),headers:{
    apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...init.headers }});
  if(!response.ok) throw new AppError(503,'账户数据库暂时不可用，请稍后重试。');
  return response.status===204 ? null : response.json();
}
// A process-wide queue serializes local development writes, including hot reloads.
const globals=globalThis as typeof globalThis & { lsQueue?:Promise<unknown> };
export async function withUserStore<T>(userId:string,fn:(store:UserStore)=>T):Promise<T> {
  if(databaseConfigured() && !userId.startsWith('guest-')) {
    for(let retry=0;retry<12;retry++) {
      const row=await dbFetch('rpc/lingosprout_read',{method:'POST',body:JSON.stringify({p_user_id:userId})});
      const store:UserStore=row?.data??fresh();
      const subscription=await dbFetch(`subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=status,source,expires_at`);
      const s=subscription?.[0];
      store.subscription=s ? {status:s.status,source:s.source,expiresAt:s.expires_at} : fresh().subscription;
      const result=fn(store);
      const success=await dbFetch('rpc/lingosprout_cas',{method:'POST',body:JSON.stringify({p_user_id:userId,p_revision:row?.revision??0,p_data:store})});
      if(success) return result;
    }
    throw new AppError(409,'账户正在处理其他请求，请稍后重试。');
  }
  if(isProduction()) throw new AppError(503,'生产环境尚未配置账户数据库；课程可继续学习。陪练请在本地开发环境体验。');
  const operation=(globals.lsQueue??Promise.resolve()).catch(()=>{}).then(async()=>{
    const file=path.join(process.cwd(),'.runtime','server.json');
    let data:Record<string,UserStore>={};
    try { data=JSON.parse(await readFile(file,'utf8')); }
    catch(error) { if((error as NodeJS.ErrnoException).code!=='ENOENT') throw new AppError(503,'本地服务数据无法读取，请检查 .runtime 文件。'); }
    data[userId]??=fresh();const result=fn(data[userId]);
    await mkdir(path.dirname(file),{recursive:true});
    await writeFile(`${file}.tmp`,JSON.stringify(data),{mode:0o600});await rename(`${file}.tmp`,file);
    return result;
  });
  globals.lsQueue=operation;return operation;
}
export function hasPremium(store:UserStore) {
  const s=store.subscription;
  return s.status==='active' && (s.source==='payment' || (!isProduction() && s.source==='demo')) && (!s.expiresAt || Date.parse(s.expiresAt)>Date.now());
}
function configuredLimit(name:string,fallback:number){const n=Number(process.env[name]??fallback);return Number.isInteger(n)&&n>0&&n<=10000?n:fallback;}
export function configuredLimits(){return {freeLimit:configuredLimit('AI_FREE_DAILY_LIMIT',5),premiumLimit:configuredLimit('AI_PREMIUM_DAILY_LIMIT',100)};}
export function limitFor(store:UserStore){const limits=configuredLimits();return hasPremium(store)?limits.premiumLimit:limits.freeLimit;}
export function quotaDay(date=new Date()) {
  const timezone=process.env.AI_QUOTA_TIMEZONE??'Asia/Shanghai';
  try { return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
  catch { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
}
export function quota(store:UserStore) {
  const used=Object.values(store.requests).filter(r=>r.day===quotaDay() && r.status==='success').length;
  const limit=limitFor(store);return {used,limit,remaining:Math.max(0,limit-used)};
}
