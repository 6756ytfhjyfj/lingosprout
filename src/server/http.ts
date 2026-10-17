import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './store';
export function failure(error:unknown) {
  if(error instanceof AppError) return NextResponse.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
  if(error instanceof ZodError) return NextResponse.json({error:'请检查输入内容和长度。'},{status:400});
  // Deliberately omit provider errors and private request payloads from logs.
  return NextResponse.json({error:'服务暂时不可用，请稍后重试。本次未扣 AI 额度。'},{status:503});
}
export function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
