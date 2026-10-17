import 'server-only';
import { cookies } from 'next/headers';
import { createHash,randomBytes } from 'node:crypto';
import type { Account,AccountOverview } from '@/lib/account-types';
import { backendConfigured,rpc } from './backend';
import { AppError } from './errors';

export const token=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'});
export async function device(create=false) {
  const jar=await cookies();let raw=jar.get('ls_device')?.value;
  if(!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) {
    if(!create) throw new AppError(401,'设备凭证已失效，请重新登录。');
    raw=token();jar.set('ls_device',raw,{...cookieOptions(),maxAge:86400*730});
  }
  return digest(raw);
}
export async function sessionAccount():Promise<Account|null> {
  const jar=await cookies();const raw=jar.get('ls_session')?.value;
  if(!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw) || !backendConfigured()) return null;
  const deviceHash=await device();
  return rpc<Account|null>('lingosprout_session',{p_session:digest(raw),p_device:deviceHash});
}
export async function requireAccount() {
  const account=await sessionAccount();if(!account)throw new AppError(401,'请先使用邮箱登录账户。');return account;
}
export async function requireAdmin() {
  const account=await requireAccount();if(!['owner','admin'].includes(account.role))throw new AppError(403,'此页面仅管理员可见。');return account;
}
export async function issueSession(userId:string,deviceHash:string,label:string) {
  const raw=token();const body={p_user:userId,p_device:deviceHash,p_session:digest(raw),p_label:label};
  try{await rpc('lingosprout_issue_session',body);}catch(e){if(!(e instanceof AppError)||e.status!==503)throw e;await rpc('lingosprout_issue_session',body);}
  (await cookies()).set('ls_session',raw,{...cookieOptions(),maxAge:86400*7});
}
export async function accountOverview() {
  const user=await requireAccount();return rpc<AccountOverview>('lingosprout_account_overview',{p_user:user.id,p_device:await device()});
}
export async function throttle(key:string,limit:number,seconds:number) {
  await rpc('lingosprout_throttle',{p_key:digest(key),p_limit:limit,p_seconds:seconds});
}
export function deviceLabel(request:Request) {
  const ua=request.headers.get('user-agent')??'';
  const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':'浏览器';
  const browser=/Edg\//.test(ua)?'Edge':/Chrome/.test(ua)?'Chrome':/Firefox/.test(ua)?'Firefox':/Safari/.test(ua)?'Safari':'Web';
  return `${os} · ${browser}`;
}
