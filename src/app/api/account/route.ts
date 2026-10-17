import { z } from 'zod';
import { accountOverview,requireAccount,device } from '@/server/accounts';
import { rpc } from '@/server/backend';
import { checkOrigin,readBody } from '@/server/identity';
import { json,failure } from '@/server/http';
export async function GET(){try{return json(await accountOverview());}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const user=await requireAccount();const body=z.object({action:z.literal('revoke-device'),deviceId:z.string().uuid()}).parse(await readBody(request,1000));await rpc('lingosprout_revoke_device',{p_user:user.id,p_device:body.deviceId,p_current:await device()});return json({message:'此设备已退出账户。注册累计次数不会因此重置。'});}catch(e){return failure(e);}}
