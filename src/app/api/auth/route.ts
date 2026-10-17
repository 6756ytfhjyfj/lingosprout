import { cookies } from 'next/headers';
import { z } from 'zod';
import { checkOrigin,readBody } from '@/server/identity';
import { authConfigured,AppError } from '@/server/store';
import { backend,rpc } from '@/server/backend';
import { device,deviceLabel,digest,issueSession,token,throttle,requireAccount } from '@/server/accounts';
import { failure,json } from '@/server/http';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkOrigin(request);const body=await readBody(request,3000);const jar=await cookies();
    if(body.action==='logout') {
      const session=jar.get('ls_session')?.value;
      if(session && authConfigured())await rpc('lingosprout_logout',{p_session:digest(session)});
      jar.delete('ls_session');jar.delete('ls_access');return json({message:'已退出账户，本机学习进度已保留。'});
    }
    if(!authConfigured())throw new AppError(503,'账户服务尚未连接。可以继续使用游客课程。');
    const deviceHash=await device(true);const label=deviceLabel(request);
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]??'local';
    await throttle(`auth:${ip}`,20,600);await throttle(`auth-device:${deviceHash}`,12,600);
    if(body.action==='password') {
      const user=await requireAccount();const input=z.object({oldPassword:z.string().min(8).max(128),password:z.string().min(10).max(128)}).parse(body);
      await passwordLogin(user.email,input.oldPassword);
      await backend(`auth/v1/admin/users/${user.id}`,{method:'PUT',body:JSON.stringify({password:input.password})});
      await rpc('lingosprout_revoke_all',{p_user:user.id});await issueSession(user.id,deviceHash,label);
      return json({message:'密码已更新，其他设备的登录已失效。'});
    }
    const input=z.object({action:z.enum(['login','signup']),email:z.email().max(254).transform(v=>v.toLowerCase().trim()),password:z.string().min(8).max(128)}).parse(body);
    await throttle(`auth-email:${input.email}`,10,600);
    if(input.action==='signup') {
      const ticket=token();
      await rpc('lingosprout_reserve_signup',{p_device:deviceHash,p_label:label,p_email:input.email,p_ticket:digest(ticket)});
      try {
        // Public Supabase signup is denied by a DB trigger. Only a server-issued,
        // single-use registration ticket can create an application account.
        const user=await backend('auth/v1/admin/users',{method:'POST',body:JSON.stringify({email:input.email,password:input.password,email_confirm:true,user_metadata:{lingosprout_ticket:digest(ticket)}})});
        if(!user.id)throw new AppError(400,'注册未完成，请稍后重试。');
        await issueSession(user.id,deviceHash,label);
        return json({message:'注册成功。邮箱用作登录名，目前尚未验证所有权。'});
      } catch(error) {
        await rpc('lingosprout_release_signup',{p_ticket:digest(ticket)}).catch(()=>{});
        throw error;
      }
    }
    const user=await passwordLogin(input.email,input.password);
    await issueSession(user.id,deviceHash,label);return json({message:'登录成功。已绑定当前浏览器设备。'});
  } catch(error){return failure(error);}
}
async function passwordLogin(email:string,password:string) {
  const response=await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY!,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!response.ok)throw new AppError(400,'登录失败，请检查邮箱和密码，或稍后重试。');
  const data=await response.json();if(!data.user?.id)throw new AppError(400,'登录未完成。');return data.user as {id:string};
}
