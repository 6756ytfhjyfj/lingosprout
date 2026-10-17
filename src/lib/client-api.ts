export async function api<T>(url:string,body?:unknown):Promise<T>{
  let response:Response;
  try{response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(40000)});}
  catch{throw new Error('网络连接中断或请求超时。请重试；重复提交同一请求不会重复扣额度。');}
  let data;try{data=await response.json();}catch{throw new Error('服务器暂时没有返回完整内容，请稍后重试。');}
  if(!response.ok)throw new Error(data.error??'请求未完成，请稍后重试。');return data;
}
