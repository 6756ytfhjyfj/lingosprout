import 'server-only';
import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { backendConfigured,rpc } from './backend';
import type { AdminSettings } from '@/lib/account-types';
import { AppError } from './errors';

export interface RuntimeSettings extends AdminSettings {encryptedKey?:string}
function encryptionKey(){const value=process.env.CONFIG_ENCRYPTION_KEY;if(!value||! /^[0-9a-f]{64}$/i.test(value))throw new AppError(503,'尚未配置 API 密钥加密服务。');return Buffer.from(value,'hex');}
export function encryptSecret(value:string){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),ciphertext].map(b=>b.toString('base64url')).join('.');}
function decryptSecret(value:string){try{const [iv,tag,ciphertext]=value.split('.').map(v=>Buffer.from(v,'base64url'));const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8');}catch{throw new AppError(503,'API 配置无法解密，请联系管理员重新保存密钥。');}}
export async function runtimeSettings():Promise<RuntimeSettings> {
  if(backendConfigured()){const settings=await rpc<RuntimeSettings>('lingosprout_settings',{});return {...settings,keyConfigured:Boolean(settings.encryptedKey??process.env.DEEPSEEK_API_KEY)};}
  return {model:process.env.DEEPSEEK_MODEL??'deepseek-flash',freeLimit:Number(process.env.AI_FREE_DAILY_LIMIT??5),premiumLimit:Number(process.env.AI_PREMIUM_DAILY_LIMIT??100),siteTitle:'语芽 LingoSprout',applicationsOpen:true,keyConfigured:Boolean(process.env.DEEPSEEK_API_KEY)};
}
export async function providerConfig(){const settings=await runtimeSettings();return {...settings,apiKey:settings.encryptedKey!==undefined?(settings.encryptedKey?decryptSecret(settings.encryptedKey):''):process.env.DEEPSEEK_API_KEY??''};}
export async function publicSettings(){const {encryptedKey:_,...settings}=await runtimeSettings();return settings;}
