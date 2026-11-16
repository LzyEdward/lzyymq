import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildAnatomicalHand} from '../tools/compile-hand-anatomy.mjs';
import {prepareHands,sculptGrip} from '../hand-sculpt.mjs';
import {createViewmodel} from '../viewmodel.mjs';

test('anatomical grip and open hand have one closed skin with bounded real proportions',()=>{
 for(const open of [false,true]){
  const {geometry:g,vertices,triangles}=buildAnatomicalHand(open),p=g.attributes.position,index=g.index;
  assert.ok(vertices<35000&&triangles<65000,'hands stay below the former implicit-surface mesh budget');
  const edges=new Map(),neighbors=Array.from({length:p.count},()=>[]);
  for(let i=0;i<index.count;i+=3)for(let k=0;k<3;k++){const a=index.getX(i+k),b=index.getX(i+(k+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);neighbors[a].push(b);neighbors[b].push(a);}
  assert.ok([...edges.values()].every(n=>n===2),'each edge must have two faces, including the elbow cap');
  const visited=new Set(),queue=[0];while(queue.length){const a=queue.pop();if(visited.has(a))continue;visited.add(a);for(const b of neighbors[a])if(!visited.has(b))queue.push(b);}
  assert.equal(visited.size,p.count,'fingers, palm, wrist and forearm remain one connected skin');
  g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<.5);assert.ok(g.boundingBox.max.z-g.boundingBox.min.z<.17);
  for(const n of p.array)assert.ok(Number.isFinite(n));
  if(!open){let minimum=Infinity;for(let i=0;i<index.count;i+=3){const points=Array.from({length:3},(_,k)=>new T.Vector3().fromBufferAttribute(p,index.getX(i+k))),[a,b,c]=points;points.push(a.clone().add(b).add(c).multiplyScalar(1/3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5));for(const v of points)if(v.y>.025&&v.y<.14)minimum=Math.min(minimum,Math.hypot(v.x,v.z));}assert.ok(minimum>.0133,`skin triangle interiors clear grip: ${minimum}`);}
 }
});
test('baked anatomical hands keep nail details attached to their own skin',async()=>{
 const original=globalThis.fetch,grip=buildAnatomicalHand(false),open=buildAnatomicalHand(true);
 globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>String(url).includes('hand-open')?open.bytes.buffer:grip.bytes.buffer});
 try{
  await prepareHands(T);
  for(const openHand of [false,true]){
   const hand=sculptGrip(T,{open:openHand});assert.equal(hand.mesh.geometry.userData.anatomical,true);
   assert.equal(hand.details.length,5);for(const nail of hand.details)assert.ok(!nail.visible||nail.userData.surfaceAttached,`${nail.name} must attach or be omitted, never float`);
   assert.ok(hand.details.filter(n=>n.visible).length>=4,'retain visible fingernails on both anatomical hands');
   const uv=hand.mesh.geometry.attributes.uv,detailUV=hand.mesh.geometry.attributes.uv1;assert.ok(uv&&detailUV);assert.notDeepEqual(uv.array,detailUV.array,'source skin UV and metre-space crease UV must remain independent');
  }
  const skinMap=new T.Texture(),model=createViewmodel(T,()=>new T.Group(),{skinMap});
  for(const mesh of [model.userData.hand,model.userData.support.children[0]]){assert.equal(mesh.material.map,skinMap);assert.equal(mesh.material.vertexColors,false);assert.equal(mesh.material.bumpMap.channel,1);}
 }finally{globalThis.fetch=original;}
});
