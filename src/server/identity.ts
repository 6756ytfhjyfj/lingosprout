import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { AppError, authConfigured, isProduction } from './store';

export async function identity() {
  const jar=await cookies();const token=jar.get('ls_access')?.value;
  if(token && authConfigured()) {
    const response=await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY!,Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(response.ok){const user=await response.json();if(user.id && !user.is_anonymous) return {id:user.id as string,email:user.email as string,authenticated:true};}
    throw new AppError(401,'登录已失效，请到“我的”重新登录。');
  }
  if(isProduction()) throw new AppError(401,'请先登录账户。游客仍可学习全部入门课程。');
  let id=jar.get('ls_guest')?.value;
  if(!id || !/^guest-[0-9a-f-]{36}$/.test(id)) {
    id=`guest-${randomUUID()}`;
    jar.set('ls_guest',id,{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:86400*365});
  }
  return {id,authenticated:false,email:undefined};
}
export function checkOrigin(request:Request) {
  const origin=request.headers.get('origin');
  // Next's internal URL can use localhost while the browser uses 127.0.0.1.
  // Host is set by the browser; never use an arbitrary forwarded-host header.
  // Pin APP_ORIGIN behind a production reverse proxy.
  const url=new URL(request.url);
  const expected=process.env.APP_ORIGIN??`${url.protocol}//${request.headers.get('host')??url.host}`;
  if(origin && origin!==expected) throw new AppError(403,'请从本站发起请求。');
  if(request.headers.get('sec-fetch-site')==='cross-site') throw new AppError(403,'不接受跨站请求。');
}
export async function readBody(request:Request,max=16000) {
  if(Number(request.headers.get('content-length')??0)>max) throw new AppError(413,'请求内容过长。');
  const reader=request.body?.getReader();if(!reader) throw new AppError(400,'请求内容为空。');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new AppError(413,'请求内容过长。');}chunks.push(value);}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {throw new AppError(400,'请求格式不正确。');}
}
