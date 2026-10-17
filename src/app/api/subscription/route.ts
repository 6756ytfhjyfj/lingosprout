import { checkOrigin, identity, readBody } from '@/server/identity';
import { AppError, isProduction, withUserStore } from '@/server/store';
import { failure, json } from '@/server/http';
export async function POST(request:Request){
  try {
    checkOrigin(request);
    if(isProduction()||process.env.ENABLE_DEMO_SUBSCRIPTIONS!=='true')throw new AppError(403,'演示订阅仅限显式启用的开发环境。真实支付尚未接入。');
    const user=await identity();if(user.authenticated)throw new AppError(403,'真实账户不支持演示权益，请使用本地游客体验。');
    const body=await readBody(request,1000);if(body.action!=='activate'&&body.action!=='cancel')throw new AppError(400,'无效的订阅操作。');
    return json(await withUserStore(user.id,s=>{s.subscription=body.action==='activate'?{status:'active',source:'demo',expiresAt:new Date(Date.now()+86400000).toISOString()}:{status:'free',source:'none',expiresAt:null};return {subscription:s.subscription};}));
  }catch(error){return failure(error);}
}
