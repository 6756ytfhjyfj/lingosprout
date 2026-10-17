import 'server-only';
import { AppError } from './errors';

export const backendConfigured = () => Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BACKEND_GATEWAY_KEY));

// The optional gateway keeps the Supabase service key inside its Edge runtime.
// Its independent credential is encrypted in the hosting environment, never sent to clients.
export async function backend(resource:string, init:RequestInit={}) {
  const safe=(init.method??'GET')==='GET'||['lingosprout_session','lingosprout_settings','lingosprout_admin_snapshot','lingosprout_account_overview','lingosprout_read'].some(name=>resource===`rest/v1/rpc/${name}`);
  try{return await attempt(resource,init);}catch(e){if(!safe||!(e instanceof AppError)||e.status!==503)throw e;return attempt(resource,init);}
}
async function attempt(resource:string, init:RequestInit) {
  if(!backendConfigured()) throw new AppError(503,'账户数据库尚未连接，游客课程仍可继续学习。');
  let response:Response;
  try {
    if(process.env.BACKEND_GATEWAY_KEY) {
      response=await fetch(`${process.env.SUPABASE_URL}/functions/v1/lingosprout-backend`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','x-lingosprout-key':process.env.BACKEND_GATEWAY_KEY},body:JSON.stringify({resource,method:init.method??'GET',body:init.body?JSON.parse(String(init.body)):undefined})});
    } else {
      const key=process.env.SUPABASE_SERVICE_ROLE_KEY!;
      response=await fetch(`${process.env.SUPABASE_URL}/${resource}`,{...init,cache:'no-store',signal:AbortSignal.timeout(12000),headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`} : {}),'Content-Type':'application/json',...init.headers}});
    }
  } catch {throw new AppError(503,'账户服务连接超时，请稍后重试。');}
  if(!response.ok) {
    // Return only deliberately raised database policy messages, never raw SQL/provider errors.
    const data=await response.json().catch(()=>({}));
    if(data.code==='P0001' && typeof data.message==='string' && data.message.startsWith('LS:')) throw new AppError(400,data.message.slice(3));
    if(resource.startsWith('auth/')&&[400,422].includes(response.status))throw new AppError(400,'注册未完成，邮箱可能已注册或不符合要求，请尝试登录。');
    throw new AppError(response.status===429?429:503,'账户服务暂时不可用，请稍后重试。');
  }
  return response.status===204?null:response.json();
}
export const rpc=<T=unknown>(name:string,body:Record<string,unknown>):Promise<T>=>backend(`rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
