import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { generateReply, opening } from '@/server/ai';
import { checkOrigin, identity, readBody } from '@/server/identity';
import { AppError, hasPremium, quota, quotaDay, withUserStore } from '@/server/store';
import { failure, json } from '@/server/http';
import {publicSettings} from '@/server/settings';
export const runtime='nodejs';export const maxDuration=45;
const settings=z.object({language:z.enum(['en','ja','ko']),scene:z.enum(['meet','restaurant','transport','shopping','hotel']),difficulty:z.enum(['zero','some'])});
const message=z.object({action:z.enum(['message','hint','summary']),sessionId:z.string().uuid(),requestId:z.string().uuid(),text:z.string().trim().max(1000).default('')});
export async function GET(request:Request){
  try {const user=await identity();const id=new URL(request.url).searchParams.get('id');
    return json(await withUserStore(user.id,s=>{
      if(id){const session=s.sessions[id];if(!session)throw new AppError(404,'会话不存在。');if(session.ended&&!hasPremium(s))throw new AppError(403,'完整会话历史为 Premium 权益。');return {session};}
      if(!hasPremium(s))throw new AppError(403,'完整会话历史为 Premium 权益。');
      return {sessions:Object.values(s.sessions).reverse()};
    }));
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  let reserved:{userId:string;requestId:string}|null=null;
  try {
    checkOrigin(request);const body=await readBody(request);const user=await identity();
    const runtimeConfig=await publicSettings();
    if(runtimeConfig.keyConfigured && !user.authenticated)throw new AppError(401,'真实 AI 陪练需要登录账户。请到“我的”登录；游客课程仍可免费学习。');
    if(body.action==='start') {
      const config=settings.parse(body);
      const session=await withUserStore(user.id,s=>{
        const now=Date.now();s.calls=s.calls.filter(t=>t>now-60000);if(s.calls.length>=12)throw new AppError(429,'操作有点频繁，请一分钟后再试。');s.calls.push(now);
        const id=randomUUID();const session:ChatSession={id,...config,messages:[{...opening(config.language,config.scene),id:randomUUID(),role:'assistant',at:new Date().toISOString()}],demo:!runtimeConfig.keyConfigured,ended:false};
        if(!hasPremium(s))s.sessions={};
        const ids=Object.keys(s.sessions);if(ids.length>=50)delete s.sessions[ids[0]];
        s.sessions[id]=session;return session;
      });return json({session});
    }
    if(body.action==='end') {
      const {sessionId}=z.object({sessionId:z.string().uuid()}).parse(body);
      await withUserStore(user.id,s=>{const session=s.sessions[sessionId];if(!session)throw new AppError(404,'会话不存在。');
        if(Object.values(s.requests).some(r=>r.sessionId===sessionId&&r.status==='pending'&&r.at>Date.now()-60000))throw new AppError(409,'请等待当前回复后再结束。');session.ended=true;});
      return json({ended:true});
    }
    const input=message.parse(body);if(input.action==='message'&&!input.text)throw new AppError(400,'先写下一句话吧。');
    const fingerprint=createHash('sha256').update(JSON.stringify({sessionId:input.sessionId,action:input.action,text:input.text})).digest('hex');
    const reservation=await withUserStore(user.id,s=>{
      const existing=s.requests[input.requestId];
      if(existing && existing.fingerprint!==fingerprint)throw new AppError(409,'重复请求标识与内容不一致。');
      if(existing?.status==='success')return {cached:existing.reply!,session:s.sessions[input.sessionId],usage:quota(s)};
      const session=s.sessions[input.sessionId];if(!session)throw new AppError(404,'会话不存在，请重新开始。');
      if(session.ended)throw new AppError(409,'本次对话已结束，请开始新的练习。');
      if(input.action==='summary'&&!hasPremium(s))throw new AppError(403,'会话总结为 Premium 权益。你仍可主动收藏对话中的表达。');
      const now=Date.now();
      for(const r of Object.values(s.requests))if(r.status==='pending'&&r.at<now-60000)r.status='failed';
      if(Object.values(s.requests).some(r=>r.status==='pending'&&r.sessionId===session.id))throw new AppError(409,'芽芽正在回复，请稍等后重试。');
      const pending=Object.values(s.requests).filter(r=>r.day===quotaDay()&&r.status==='pending').length;
      const q=quota(s);if(q.used+pending>=q.limit)throw new AppError(429,'今天的陪练额度已用完，明天再来聊。基础课程与复习可以继续。');
      s.calls=s.calls.filter(t=>t>now-60000);if(s.calls.length>=12)throw new AppError(429,'操作有点频繁，请一分钟后再试。');s.calls.push(now);
      s.requests[input.requestId]={id:input.requestId,fingerprint,day:quotaDay(),sessionId:session.id,status:'pending',at:now};
      // Retain only recent idempotency receipts; daily accounting remains stable.
      for(const [key,r] of Object.entries(s.requests))if(r.day<quotaDay(new Date(now-7*86400000)))delete s.requests[key];
      return {session:structuredClone(session)};
    });
    if('cached' in reservation)return json({reply:reservation.cached,session:reservation.session,usage:reservation.usage});
    reserved={userId:user.id,requestId:input.requestId};
    const reply=await generateReply(reservation.session,input.action,input.text);
    const result=await withUserStore(user.id,s=>{
      const record=s.requests[input.requestId];if(record.status==='success')return {reply:record.reply,session:s.sessions[input.sessionId],usage:quota(s)};
      const session=s.sessions[input.sessionId];if(!session)throw new AppError(409,'会话已更新，请重新开始。');
      const at=new Date().toISOString();
      if(input.action==='message')session.messages.push({id:randomUUID(),role:'user',text:input.text,translation:'',correction:null,phrases:[],improvements:[],at});
      if(input.action==='summary'){session.summary=reply;session.ended=true;}
      else session.messages.push({...reply,id:randomUUID(),role:'assistant',at} as ChatMessage);
      // Cap stored messages to avoid unbounded histories; 100-message daily cap remains independent.
      session.messages=session.messages.slice(-202);
      record.status='success';record.reply=reply;
      return {reply,session,usage:quota(s)};
    });reserved=null;return json(result);
  }catch(error){
    if(reserved)try{await withUserStore(reserved.userId,s=>{const r=s.requests[reserved!.requestId];if(r?.status==='pending')r.status='failed';});}catch{}
    return failure(error);
  }
}
