import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCourtNet,netDeflection,netHeightAt,NET_HALF_WIDTH} from '../court-net.mjs';

test('net geometry follows regulation center and post heights with fixed attachments',()=>{
 assert.equal(netHeightAt(0),1.524);assert.equal(netHeightAt(3.05),1.55);
 const net=createCourtNet(T),tape=net.getObjectByName('Woven double-stitched net tape'),points=tape.geometry.attributes.position;
 let top=-Infinity;
 for(let i=0;i<points.count;i++){const x=points.getX(i),y=points.getY(i);assert.ok(y<=netHeightAt(x)+1e-7&&y>=netHeightAt(x)-.075-1e-7);top=Math.max(top,y);}
 assert.ok(Math.abs(top-1.55)<1e-6);let calls=0;net.traverse(o=>{if(o.isMesh)calls++;});assert.equal(calls,5);
 for(let age=0;age<1.5;age+=.01)for(const x of [-NET_HALF_WIDTH,NET_HALF_WIDTH])assert.equal(netDeflection(x,1.2,{age}),0);
});

test('net ripple stays local, decays and returns exactly to its baseline at every frame rate',()=>{
 const hit={x:-.9,y:1.2,strength:1.2,age:.05};assert.ok(netDeflection(-.9,1.2,hit)>.015);assert.ok(Math.abs(netDeflection(2,1.2,hit))<1e-8);
 assert.ok(Math.abs(netDeflection(-.9,1.2,{...hit,age:1.1}))<.002);
 assert.equal(netDeflection(-.9,1.2,{...hit,age:1.4}),0);
 for(const hz of [30,60,120]){
  const net=createCourtNet(T);net.userData.hit(hit,1.2);let maximum=0;
  for(let i=0;i<hz*2;i++){net.userData.update(1/hz);maximum=Math.max(maximum,net.userData.maxDeflection);}
  assert.ok(maximum>.01&&maximum<.10);assert.equal(net.userData.maxDeflection,0);
  net.traverse(m=>{if(m.isMesh)for(const n of m.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
  assert.equal(net.rotation.x,0);
 }
});
