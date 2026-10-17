import { identity } from '@/server/identity';
import { authConfigured, configuredLimits, hasPremium, isProduction, quota, withUserStore } from '@/server/store';
import { json, failure } from '@/server/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){
  try {
    const user=await identity();const status=await withUserStore(user.id,s=>({subscription:hasPremium(s)?s.subscription:{status:'free',source:'none',expiresAt:null},...quota(s)}));
    return json({...status,...configuredLimits(),demo:!process.env.DEEPSEEK_API_KEY,authenticated:user.authenticated,email:user.email,canDemoSubscribe:!user.authenticated && !isProduction() && process.env.ENABLE_DEMO_SUBSCRIPTIONS==='true',
      priceLabel:process.env.PREMIUM_PRICE_LABEL??'',resetLabel:`每日 00:00 重置（${process.env.AI_QUOTA_TIMEZONE??'Asia/Shanghai'}）`,authConfigured:authConfigured()});
  } catch(error) {
    if(isProduction()) return json({subscription:{status:'free',source:'none',expiresAt:null},used:0,...configuredLimits(),limit:configuredLimits().freeLimit,remaining:configuredLimits().freeLimit,
      demo:!process.env.DEEPSEEK_API_KEY,authenticated:false,canDemoSubscribe:false,priceLabel:process.env.PREMIUM_PRICE_LABEL??'',resetLabel:'每日 00:00 重置（Asia/Shanghai）',authConfigured:authConfigured()});
    return failure(error);
  }
}
