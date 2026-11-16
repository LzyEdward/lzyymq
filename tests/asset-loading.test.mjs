import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedAsset,handBufferLayout} from '../asset-loading.mjs';

test('optional assets time out and abort the download without preventing startup',async()=>{
 let signal,warning;
 const result=await boundedAsset(s=>{signal=s;return new Promise(()=>{});},{timeout:15,fallback:'lightweight',onWarning:w=>warning=w});
 assert.equal(result,'lightweight');assert.equal(signal.aborted,true);assert.equal(warning.reason,'timeout');
});
test('UV hand format validates aligned streams and rejects partial modern downloads',()=>{
 const n=1000,count=3000,uvOffset=Math.ceil((16+n*21)/4)*4,indexOffset=uvOffset+n*8,buffer=new ArrayBuffer(indexOffset+count*4);new Uint32Array(buffer,0,4).set([0x32444846,n,count,1]);
 assert.deepEqual(handBufferLayout(buffer),{vertices:n,indices:count,indexOffset,positionOffset:16,uvOffset});
 for(const bytes of [buffer.slice(0,buffer.byteLength-1),buffer.slice(0,12)])assert.throws(()=>handBufferLayout(bytes));
});
test('download errors degrade but successful values and loaders are preserved',async()=>{
 const warnings=[];assert.equal(await boundedAsset(()=>{throw new Error('offline');},{fallback:()=>42,onWarning:w=>warnings.push(w)}),42);
 assert.equal(warnings.length,1);assert.equal(warnings[0].reason,'load');
 assert.equal(await boundedAsset(async()=>7,{timeout:50,onWarning:()=>assert.fail()}),7);
});
test('reject truncated, empty and malicious hand headers before allocating geometry',()=>{
 for(const value of [new ArrayBuffer(0),new ArrayBuffer(8),new Uint32Array([0xffffffff,0xffffffff]).buffer,new Uint32Array([1000,3000]).buffer])assert.throws(()=>handBufferLayout(value));
 const n=1000,count=3000,offset=Math.ceil((8+n*21)/4)*4,bytes=new ArrayBuffer(offset+count*4);new Uint32Array(bytes,0,2).set([n,count]);
 assert.deepEqual(handBufferLayout(bytes),{vertices:n,indices:count,indexOffset:offset});
});
