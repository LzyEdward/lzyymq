import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import * as T from 'three';
import {decodeAssetBuffer} from '../asset-loading.mjs';
import {prepareHands} from '../hand-sculpt.mjs';
import {preparePlayerArm,playerArmAvailable} from '../player-arm.mjs';
import {createViewmodel} from '../viewmodel.mjs';
import {ARM_NAILS} from '../arm-nails.mjs';
import {buildPlayerArm} from '../tools/compile-player-arm.mjs';

test('compressed arm decodes exactly and already decoded server responses remain unchanged',async()=>{
 const bytes=new Uint8Array([1,2,3,4,5,6]),compressed=gzipSync(bytes);
 assert.deepEqual(new Uint8Array(await decodeAssetBuffer(compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength))),bytes);
 assert.equal(await decodeAssetBuffer(bytes.buffer),bytes.buffer);
 await assert.rejects(decodeAssetBuffer(new Uint8Array([31,139,0]).buffer));
});
test('complete-arm startup needs one model request, retains skin and nail attachments, and falls back without a second download',async()=>{
 const previous=globalThis.fetch,requests=[],data=gzipSync(buildPlayerArm().bytes);
 globalThis.fetch=async url=>{requests.push(String(url));return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
 try{
  await Promise.all([prepareHands(T,{safe:true}),preparePlayerArm(T)]);
  assert.equal(requests.length,1);assert.ok(requests[0].includes('player-arm.bin.gz'));assert.equal(playerArmAvailable(),true);
  const skinMap=new T.Texture(),model=createViewmodel(T,()=>new T.Group(),{articulated:true,skinMap});
  assert.equal(model.userData.hand,model.userData.fullArm.mesh);
  assert.equal(model.userData.hand.material.map,skinMap);assert.equal(model.userData.hand.material.vertexColors,false);
  assert.equal(model.userData.hand.geometry.attributes.position.count>30000,true);
  assert.equal(model.children.some(o=>o.isMesh&&o.geometry.attributes.position?.count>1000),false,'do not build a hidden duplicate palm');
  const nails=model.children.filter(o=>o.name.endsWith(' nail'));assert.equal(nails.length,5);
  for(let i=0;i<5;i++){assert.deepEqual(nails[i].position.toArray(),ARM_NAILS.grip[i].position);assert.deepEqual(nails[i].scale.toArray(),ARM_NAILS.grip[i].scale);}
  await preparePlayerArm(T,{safe:true});assert.equal(playerArmAvailable(),false);assert.equal(requests.length,1);
  const fallback=createViewmodel(T,()=>new T.Group(),{articulated:true});assert.equal(fallback.userData.fullArm,undefined);assert.ok(fallback.userData.hand.geometry.attributes.position.count>1000);
 }finally{globalThis.fetch=previous;}
});
