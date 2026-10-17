import { cookies } from 'next/headers';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { checkOrigin,readBody } from '@/server/identity';
import { device,deviceLabel,token,digest,cookieOptions,requireAccount,throttle } from '@/server/accounts';
import { backendConfigured,rpc } from '@/server/backend';
import { json,failure } from '@/server/http';
import { AppError } from '@/server/errors';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('start')}),z.object({action:z.literal('poll'),id:z.string().uuid()}),
 z.object({action:z.enum(['inspect','approve','deny']),id:z.string().uuid(),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)})
]);
export const runtime='nodejs';
export async function POST(request:Request){try{
 checkOrigin(request);if(!backendConfigured())throw new AppError(503,'扫码登录尚未连接账户服务。');
 const body=input.parse(await readBody(request,2000));const jar=await cookies();
 if(body.action==='start') {
  const d=await device(true);await throttle(`qr-start:${d}`,8,60);
  const poll=token(),scan=token();const code=String(randomInt(100000,1000000));
  const result=await rpc<{id:string;expiresAt:string;code:string}>('lingosprout_qr_start',{p_device:d,p_label:deviceLabel(request),p_poll:digest(poll),p_scan:digest(scan),p_code:code});
  jar.set('ls_qr_poll',poll,{...cookieOptions(),maxAge:120});
  const url=new URL(request.url);
  const origin=process.env.APP_ORIGIN??`${url.protocol}//${request.headers.get('host')??url.host}`;
  return json({...result,url:`${origin}/scan#id=${result.id}&token=${scan}`});
 }
 if(body.action==='poll') {
  const d=await device();const poll=jar.get('ls_qr_poll')?.value;
  if(!poll)throw new AppError(400,'二维码已过期，请刷新二维码。');
  await throttle(`qr-poll:${d}`,90,60);
  const session=token();const result=await rpc<{status:string}>('lingosprout_qr_poll',{p_id:body.id,p_poll:digest(poll),p_device:d,p_session:digest(session)});
  if(result.status==='authenticated'){jar.set('ls_session',session,{...cookieOptions(),maxAge:86400*7});jar.delete('ls_qr_poll');}
  return json(result);
 }
 const user=await requireAccount();await throttle(`qr-scan:${user.id}`,20,60);
 return json(await rpc('lingosprout_qr_scan',{p_id:body.id,p_scan:digest(body.token),p_user:user.id,p_action:body.action}));
}catch(e){return failure(e);}}
