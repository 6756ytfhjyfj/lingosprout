import { z } from 'zod';
import { requireAdmin,throttle } from '@/server/accounts';
import { rpc } from '@/server/backend';
import { checkOrigin,readBody } from '@/server/identity';
import { json,failure } from '@/server/http';
import { encryptSecret,providerConfig } from '@/server/settings';
import { AppError } from '@/server/errors';
const uuid=z.string().uuid();const expires=z.iso.datetime({offset:true});
const action=z.discriminatedUnion('action',[
 z.object({action:z.enum(['approve','reject']),applicationId:uuid,expiresAt:expires.optional(),note:z.string().max(300).default('')}),
 z.object({action:z.literal('grant'),userId:uuid,expiresAt:expires}),
 z.object({action:z.literal('revoke'),userId:uuid}),
 z.object({action:z.literal('disable'),userId:uuid,disabled:z.boolean()}),
 z.object({action:z.literal('role'),userId:uuid,role:z.enum(['member','admin'])}),
 z.object({action:z.literal('create-title'),name:z.string().trim().min(1).max(20),color:z.enum(['green','gold','purple','blue','peach'])}),
 z.object({action:z.enum(['assign-title','remove-title']),userId:uuid,titleId:uuid}),
 z.object({action:z.literal('settings'),model:z.string().regex(/^[a-zA-Z0-9._:-]{1,80}$/),freeLimit:z.number().int().min(1).max(10000),premiumLimit:z.number().int().min(1).max(10000),siteTitle:z.string().trim().min(1).max(60),applicationsOpen:z.boolean(),apiKey:z.string().trim().max(500).optional(),clearKey:z.boolean().optional()}),
 z.object({action:z.literal('test-api')})
]);
export const runtime='nodejs';
export async function GET(){try{const user=await requireAdmin();return json(await rpc('lingosprout_admin_snapshot',{p_actor:user.id}));}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await requireAdmin();await throttle(`admin:${user.id}`,40,60);
 const input=action.parse(await readBody(request,6000));
 if(input.action==='test-api') {
  const config=await providerConfig();if(!config.apiKey)throw new AppError(400,'请先保存 DeepSeek API 密钥。');
  let response:Response;
  try{response=await fetch('https://api.deepseek.com/models',{headers:{Authorization:`Bearer ${config.apiKey}`},cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw new AppError(504,'API 连通性检查超时，请重试。');}
  if(!response.ok)throw new AppError(502,'API 连接失败，请检查密钥或服务状态。');
  const body=await response.json();return json({message:'DeepSeek 已连接；检查模型列表没有发送对话。',models:(body.data??[]).map((m:{id:string})=>m.id)});
 }
 const {action:kind,...data}=input;
 if(kind==='settings') {
  const settings=data as Omit<Extract<z.infer<typeof action>,{action:'settings'}>,'action'>;
  const {apiKey,clearKey,...safe}=settings;
  await rpc('lingosprout_admin_mutation',{p_actor:user.id,p_action:kind,p_data:{...safe,...(apiKey?{encryptedKey:encryptSecret(apiKey)}:clearKey?{encryptedKey:''}:{})}});
 } else await rpc('lingosprout_admin_mutation',{p_actor:user.id,p_action:kind,p_data:data});
 return json({message:'已保存。权限和有效期由服务端即时校验。'});
}catch(e){return failure(e);}}
