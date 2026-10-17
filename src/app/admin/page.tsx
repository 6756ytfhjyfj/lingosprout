import {requireAdmin} from '@/server/accounts';
import Admin from '@/components/Admin';
export const dynamic='force-dynamic';
export const metadata={title:'管理花园 · 语芽 LingoSprout',robots:{index:false,follow:false}};
export default async function AdminPage(){let user;try{user=await requireAdmin();}catch{return <main className="account-screen"><div className="account-login-card"><span className="eyebrow">LINGOSPROUT ADMIN</span><h1>管理花园</h1><p>此页面仅管理员可见。请使用管理员邮箱登录；普通账户没有访问权限。</p><a className="button button-primary" href="/login?next=/admin">管理员登录</a><a className="text-link" href="/">返回学习</a></div></main>;}return <Admin actor={user}/>;}
