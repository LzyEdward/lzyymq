import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildPlayerArm} from '../tools/compile-player-arm.mjs';
import {armBufferLayout,preparePlayerArm,createSkinnedPlayerArm} from '../player-arm.mjs';
import {createArmKinematics} from '../first-person-arm.mjs';
import {swingPose} from '../motion.mjs';
import {handUV} from '../hand-surface.mjs';

const compiled=buildPlayerArm();
test('complete arm retains one closed connected shoulder elbow wrist skin with normalized bone influences',()=>{
 const {geometry:g}=compiled,p=g.attributes.position,edges=new Map(),welded=new Map(),canonical=[];
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(7)).join(',');if(!welded.has(key))welded.set(key,welded.size);canonical.push(welded.get(key));}
 const neighbors=Array.from({length:welded.size},()=>[]);
 assert.ok(compiled.vertices<40000&&compiled.triangles<80000);
 assert.ok(compiled.boundaryBounds[0].every(x=>Math.abs(x+.205)<1e-6),'only the hidden shoulder is capped, never bridge the sleeve rim to it');
 for(let i=0;i<g.index.count;i+=3)for(let j=0;j<3;j++){const a=canonical[g.index.array[i+j]],b=canonical[g.index.array[i+(j+1)%3]],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);neighbors[a].push(b);neighbors[b].push(a);}
 assert.ok([...edges.values()].every(n=>n===2),'no elbow, wrist or shoulder crop holes');
 const visited=new Set(),queue=[0];while(queue.length){const v=queue.pop();if(visited.has(v))continue;visited.add(v);queue.push(...neighbors[v].filter(n=>!visited.has(n)));}assert.equal(visited.size,welded.size);
 const seamData=new Map();let seams=0;
 for(let i=0;i<p.count;i++){const key=canonical[i],n=new T.Vector3().fromBufferAttribute(g.attributes.normal,i),uv=new T.Vector2().fromBufferAttribute(g.attributes.uv,i);if(seamData.has(key)){const previous=seamData.get(key);assert.ok(previous.n.distanceTo(n)<1e-8,'texture split must never create a shading seam');if(previous.uv.distanceTo(uv)>.01)seams++;}else seamData.set(key,{n,uv});}
 assert.ok(seams>100,'preserve original atlas discontinuities instead of smearing across islands');
 for(let i=0;i<p.count;i++){let sum=0;for(let k=0;k<4;k++){assert.ok(g.attributes.skinIndex.array[i*4+k]<18);sum+=g.attributes.skinWeight.array[i*4+k];}assert.ok(Math.abs(sum-1)<1e-6);}
});

test('relaxed support skin and attached nails follow finger bones without accumulating transforms',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>compiled.bytes.buffer});
 try{
  await preparePlayerArm(T);const skin=new T.MeshPhysicalMaterial({bumpMap:new T.Texture()}),fabric=new T.MeshPhysicalMaterial(),arm=createSkinnedPlayerArm(T,{skin,fabric,open:true}),rig=createArmKinematics(T),group=new T.Group();group.add(arm.root);
  const details=Array.from({length:5},(_,i)=>{const nail=new T.Object3D();nail.position.set(-.02,.14-i*.02,.02);return nail;}),samples=[10000,15000,20000,25000];
  arm.update(group,rig.chain(group));const before=samples.map(i=>arm.mesh.getVertexPosition(i,new T.Vector3()));
  arm.poseNails(details);const initial=details.map(o=>o.matrix.clone());
  arm.relaxFingers(1);arm.update(group,rig.chain(group));arm.poseNails(details);
  assert.ok(details.some((o,i)=>new T.Vector3().setFromMatrixPosition(o.matrix).distanceTo(new T.Vector3().setFromMatrixPosition(initial[i]))>.02));
  const fixed=details.map(o=>o.matrix.clone());arm.poseNails(details);for(let i=0;i<5;i++)assert.deepEqual(details[i].matrix.elements,fixed[i].elements);
  for(let i=0;i<arm.mesh.geometry.attributes.position.count;i+=53)assert.ok(arm.mesh.getVertexPosition(i,new T.Vector3()).toArray().every(Number.isFinite));
  arm.relaxFingers(0);arm.update(group,rig.chain(group));arm.poseNails(details);
  for(let i=0;i<5;i++)for(let k=0;k<16;k++)assert.ok(Math.abs(details[i].matrix.elements[k]-initial[i].elements[k])<1e-10);
  for(let k=0;k<samples.length;k++)assert.ok(arm.mesh.getVertexPosition(samples[k],new T.Vector3()).distanceTo(before[k])<1e-8);
 }finally{globalThis.fetch=previous;}
});
test('complete arm buffer rejects truncated streams before constructing WebGL attributes',()=>{
 const layout=armBufferLayout(compiled.bytes.buffer);assert.equal(layout.vertices,compiled.vertices);assert.equal(layout.bones,18);
 for(const size of [0,23,24,100,compiled.bytes.length-1])assert.throws(()=>armBufferLayout(compiled.bytes.buffer.slice(0,size)));
});
test('complete arm skinning stays finite with planted shoulder through normal and assisted strike poses',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>compiled.bytes.buffer});
 try{
  await preparePlayerArm(T);const skin=new T.MeshPhysicalMaterial({vertexColors:true,bumpMap:new T.Texture()}),fabric=new T.MeshPhysicalMaterial(),arm=createSkinnedPlayerArm(T,{skin,fabric}),rig=createArmKinematics(T),group=new T.Group();group.add(arm.root);
  for(const contact of [null,[.45,.7,-.95],[-.65,.4,-1.05],[1.2,.9,-1.8]])for(const kind of ['smash','drop','netcross'])for(let t=.005;t<.48;t+=.02){
   const pose=rig.pose(swingPose({elapsed:t,kind,contact}));group.position.fromArray(pose.position);group.rotation.fromArray([...pose.rotation,'XYZ']);const chain=rig.chain(group);arm.update(group,chain);
   for(let i=0;i<arm.mesh.geometry.attributes.position.count;i+=71){const point=arm.mesh.getVertexPosition(i,new T.Vector3());assert.ok(point.toArray().every(Number.isFinite));assert.ok(point.length()<6);}
  }
 }finally{globalThis.fetch=previous;}
});

test('arm crease UV follows the posed palm while colour keeps the anatomical atlas',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>compiled.bytes.buffer});
 try{
  await preparePlayerArm(T);const skin=new T.MeshPhysicalMaterial({bumpMap:new T.Texture()}),fabric=new T.MeshPhysicalMaterial();
  const arm=createSkinnedPlayerArm(T,{skin,fabric}),open=createSkinnedPlayerArm(T,{skin,fabric,open:true});
  assert.equal(arm.mesh.material.bumpMap.channel,1);assert.equal(skin.bumpMap.channel,0);
  assert.equal(arm.mesh.geometry.attributes.position,open.mesh.geometry.attributes.position,'both hands share immutable geometry streams');
  assert.notEqual(arm.mesh.geometry.attributes.uv1,open.mesh.geometry.attributes.uv1,'open hand has its own crease coordinates');
  const group=new T.Group(),rig=createArmKinematics(T);group.add(arm.root);arm.update(group,rig.chain(group));
  const g=arm.mesh.geometry,uv=g.attributes.uv1;let checked=0;
  for(let i=0;i<uv.count;i+=7){
   assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
   let limb=0;for(let k=0;k<4;k++)if(g.attributes.skinIndex.array[i*4+k]<2)limb+=g.attributes.skinWeight.array[i*4+k];
   if(limb>1e-6)continue;
   const p=arm.mesh.getVertexPosition(i,new T.Vector3()),expected=handUV(p.x,p.y);
   assert.ok(Math.abs(expected[0]-uv.getX(i))<1e-5&&Math.abs(expected[1]-uv.getY(i))<1e-5);checked++;
  }
  assert.ok(checked>500);
 }finally{globalThis.fetch=previous;}
});
