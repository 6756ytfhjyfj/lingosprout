import {NextResponse,type NextRequest} from 'next/server';
// Establish the development guest before the HTML starts parallel API calls.
// This cookie never confers production identity, Premium or administrator rights.
export function proxy(request:NextRequest){
 const canonical=process.env.APP_ORIGIN;
 if(process.env.NODE_ENV==='production'&&canonical&&request.nextUrl.origin!==canonical)return NextResponse.redirect(new URL(request.nextUrl.pathname+request.nextUrl.search,canonical),308);
 const response=NextResponse.next();if(process.env.NODE_ENV!=='production'&&!request.cookies.has('ls_guest'))response.cookies.set('ls_guest',`guest-${crypto.randomUUID()}`,{httpOnly:true,sameSite:'strict',path:'/',maxAge:86400*365});return response;
}
export const config={matcher:['/','/login','/scan','/admin']};
