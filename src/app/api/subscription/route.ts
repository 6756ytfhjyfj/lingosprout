import { json } from '@/server/http';
export async function POST(){return json({error:'Premium 通过申请后由管理员授权，不提供演示开通或自助购买。'},403);}
