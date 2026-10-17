import { z } from 'zod';
import { requireAccount,accountOverview } from '@/server/accounts';
import { rpc } from '@/server/backend';
import { checkOrigin,readBody } from '@/server/identity';
import { json,failure } from '@/server/http';
export async function GET(){try{const overview=await accountOverview();return json({applications:overview.applications,count:overview.account.application_count});}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const user=await requireAccount();const input=z.object({message:z.string().trim().min(5).max(500)}).parse(await readBody(request,3000));const application=await rpc('lingosprout_apply',{p_user:user.id,p_message:input.message});return json({application,message:'申请已送达管理员，请在此查看审核进度。'});}catch(e){return failure(e);}}
