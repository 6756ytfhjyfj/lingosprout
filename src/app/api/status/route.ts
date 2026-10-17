import { identity } from '@/server/identity';
import { authConfigured, hasPremium, quota, withUserStore } from '@/server/store';
import { json, failure } from '@/server/http';
import { publicSettings } from '@/server/settings';
import {AppError} from '@/server/errors';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){
  let settings;
  try {
    settings=await publicSettings();
    const user=await identity();const status=await withUserStore(user.id,s=>({subscription:hasPremium(s)?s.subscription:{status:'free',source:'none',expiresAt:null},...quota(s)}),true);
    return json({...status,freeLimit:settings.freeLimit,premiumLimit:settings.premiumLimit,siteTitle:settings.siteTitle,demo:!settings.keyConfigured,authenticated:user.authenticated,email:user.email,role:'role' in user?user.role:undefined,titles:'titles' in user?user.titles:[],canDemoSubscribe:false,
      priceLabel:process.env.PREMIUM_PRICE_LABEL??'',resetLabel:`每日 00:00 重置（${process.env.AI_QUOTA_TIMEZONE??'Asia/Shanghai'}）`,authConfigured:authConfigured()});
  } catch(error) {
    if(settings&&error instanceof AppError&&error.status===401) return json({subscription:{status:'free',source:'none',expiresAt:null},used:0,freeLimit:settings.freeLimit,premiumLimit:settings.premiumLimit,limit:settings.freeLimit,remaining:settings.freeLimit,siteTitle:settings.siteTitle,
      demo:!settings.keyConfigured,authenticated:false,canDemoSubscribe:false,priceLabel:'',resetLabel:'每日 00:00 重置（Asia/Shanghai）',authConfigured:authConfigured()});
    return failure(error);
  }
}
