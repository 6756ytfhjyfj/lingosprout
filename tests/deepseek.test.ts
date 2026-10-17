import test from 'node:test';
import assert from 'node:assert/strict';
import {callDeepSeek} from '../src/server/deepseek';
import {AppError} from '../src/server/errors';
const input={apiKey:'test-only-not-a-secret',model:'deepseek-flash',messages:[{role:'system',content:'Return json'},{role:'user',content:'Hello'}]};
const reply={text:'Hello! What is your name?',translation:'你好！你叫什么名字？',correction:null,phrases:[{target:'Hello',meaning:'你好'}],improvements:[]};
test('provider uses documented endpoint, model, JSON output and a bounded timeout',async()=>{
  const result=await callDeepSeek(input,async(url,options)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');const body=JSON.parse(options!.body as string);assert.equal(body.model,'deepseek-flash');assert.deepEqual(body.response_format,{type:'json_object'});assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.max_tokens,1200);assert.ok(options!.signal);return Response.json({choices:[{message:{content:JSON.stringify(reply)}}]});});assert.deepEqual(result,reply);
});
test('provider network errors and timeout become safe retryable errors',async()=>{
  for(const error of [new Error('private upstream detail'),new DOMException('timed out','TimeoutError')])await assert.rejects(callDeepSeek(input,async()=>{throw error;}),e=>e instanceof AppError&&e.status===504&&!e.message.includes('private'));
});
test('provider rate errors, malformed JSON and missing content never return success',async()=>{
  for(const response of [new Response('sensitive upstream body',{status:429}),Response.json({choices:[{message:{content:'{"text":'}}]}),Response.json({choices:[{message:{content:''}}]}),Response.json({choices:[{message:{content:'{"text":"hello"}'}}]})]){
    await assert.rejects(callDeepSeek(input,async()=>response),e=>e instanceof AppError&&e.status===502&&e.message.includes('未扣额度')&&!e.message.includes('sensitive'));
  }
});
