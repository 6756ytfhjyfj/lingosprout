import { cookies } from 'next/headers';
import { z } from 'zod';
import { checkOrigin, readBody } from '@/server/identity';
import { AppError, authConfigured, isProduction } from '@/server/store';
import { failure, json } from '@/server/http';
const authCalls=new Map<string,number[]>();
export async function POST(request:Request){
  try {
    checkOrigin(request);if(!authConfigured())throw new AppError(503,'尚未配置 Supabase 账户服务。可以继续使用游客模式，进度保存在此浏览器。');
    const jar=await cookies();const body=await readBody(request,3000);
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]??'local';const now=Date.now();const calls=(authCalls.get(ip)??[]).filter(t=>t>now-60000);
    if(calls.length>=8)throw new AppError(429,'登录操作过于频繁，请一分钟后重试。');calls.push(now);authCalls.set(ip,calls);
    if(authCalls.size>10000)authCalls.clear();
    const headers={apikey:process.env.SUPABASE_PUBLISHABLE_KEY!,'Content-Type':'application/json'};
    if(body.action==='logout') {
      const access=jar.get('ls_access')?.value;
      if(access)await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:{...headers,Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(8000)}).catch(()=>{});
      jar.delete('ls_access');return json({message:'已退出登录；本机课程进度仍然保留。'});
    }
    const input=z.object({action:z.enum(['login','signup']),email:z.email().max(254),password:z.string().min(8).max(128)}).parse(body);
    const endpoint=input.action==='signup'?'signup':'token?grant_type=password';
    const response=await fetch(`${process.env.SUPABASE_URL}/auth/v1/${endpoint}`,{method:'POST',headers,body:JSON.stringify({email:input.email,password:input.password}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new AppError(400,input.action==='login'?'登录失败，请检查邮箱、密码或确认邮件。':'注册未完成，请检查邮箱是否可用或稍后重试。');
    const data=await response.json();
    if(data.access_token)jar.set('ls_access',data.access_token,{httpOnly:true,secure:isProduction(),sameSite:'strict',path:'/',maxAge:data.expires_in??3600});
    return json({message:data.access_token?'登录成功。课程进度仍在本机；账户用于真实 AI 陪练与权益校验。':'请查收确认邮件，验证邮箱后回来登录。'});
  }catch(error){return failure(error);}
}
