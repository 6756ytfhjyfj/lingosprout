import { z } from 'zod';
import {AppError} from './errors';
import type {AIReply} from '../lib/types';
export const replySchema=z.object({text:z.string().min(1).max(4000),translation:z.string().max(4000),correction:z.object({original:z.string().max(1000),suggestion:z.string().max(1000),explanation:z.string().max(1000)}).nullable(),phrases:z.array(z.object({target:z.string().max(500),meaning:z.string().max(500)})).max(8),improvements:z.array(z.string().max(600)).max(6)});
// This provider adapter has no access to subscription or quota state. Tests can
// inject transport failures without a production bypass or a real API key.
export async function callDeepSeek({apiKey,model,messages}:{apiKey:string;model:string;messages:{role:string;content:string}[]},transport:typeof fetch=fetch):Promise<AIReply>{
  let response:Response;
  try {response=await transport('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,messages,thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:1200,stream:false}),signal:AbortSignal.timeout(25000)});}
  catch {throw new AppError(504,'陪练连接超时或网络不可用，本次未扣额度。请重试。');}
  if(!response.ok)throw new AppError(502,response.status===429?'AI 服务繁忙，本次未扣额度。稍后再试。':'AI 服务暂时不可用，本次未扣额度。请检查服务端配置或稍后重试。');
  try {const payload=await response.json();return replySchema.parse(JSON.parse(payload.choices[0].message.content));}
  catch {throw new AppError(502,'AI 回复格式不完整，本次未扣额度。请重试。');}
}
