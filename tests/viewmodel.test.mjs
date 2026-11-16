import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createViewmodel} from '../viewmodel.mjs';
import {createAthlete} from '../athlete-real.mjs';

function withCanvas(fn){
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};
 try{return fn();}finally{globalThis.document=previous;}
}
test('first-person hands preserve smooth skin normals and have connected forearms',()=>withCanvas(()=>{
 const model=createViewmodel(THREE,()=>new THREE.Group()),hand=model.userData.hand;
 assert.ok(hand.geometry.attributes.position.count>1000);
 const gripAxisStart=model.userData.racketModel.position.clone().add(new THREE.Vector3(0,0,0));
 const handPositions=hand.geometry.attributes.position;let closestGrip=Infinity;
 for(let i=0;i<handPositions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(handPositions,i);const y=THREE.MathUtils.clamp(p.y-gripAxisStart.y,.015,.15);closestGrip=Math.min(closestGrip,p.distanceTo(new THREE.Vector3(gripAxisStart.x,gripAxisStart.y+y,gripAxisStart.z)));}
 assert.ok(closestGrip<.055,`the racket grip should sit within the wrapped fingers (closest ${closestGrip})`);
 assert.deepEqual(model.userData.gripReport.handleAxis,[0,.075,0]);
 assert.equal(model.userData.gripReport.closedSurface,true);
 assert.equal(hand.userData.fingerCount,5);
 let curved=0;const normals=hand.geometry.attributes.normal;
 for(let i=0;i<normals.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(normals,i),b=new THREE.Vector3().fromBufferAttribute(normals,i+1);
  if(a.distanceTo(b)>.005)curved++;
  assert.ok(Math.abs(a.length()-1)<1e-5);
 }
 assert.ok(curved>normals.count/9,'curved faces must not use a single flat normal');
 assert.equal(model.userData.support.children.length,7,'support has continuous skin, five nails and a sleeve');
 const arms=[];for(const group of [model,model.userData.support])group.traverse(o=>{if(o.isMesh&&o.name==='Continuous forearm')arms.push(o);});
 assert.equal(arms.length,2,'racket and support arms each use a closed forearm mesh');
 for(const arm of arms){
  const index=arm.geometry.index,positions=arm.geometry.attributes.position;
  assert.ok(index&&index.count%3===0,'the skin and arm are a single triangulated surface');
  const edges=new Map();for(let i=0;i<index.count;i+=3)for(let k=0;k<3;k++){const a=index.getX(i+k),b=index.getX(i+(k+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(n=>n===2),'every edge has two incident faces: no wrist or palm holes');
  for(const component of positions.array)assert.ok(Number.isFinite(component));
 }
 const sleeves=[];for(const group of [model,model.userData.support])group.traverse(o=>{if(o.isMesh&&o.name==='Rounded sleeve')sleeves.push(o);});
 assert.equal(sleeves.length,2);for(const sleeve of sleeves){assert.ok(sleeve.userData.maxRadius<=.055,'the sleeve cuff should fit the forearm');assert.ok(sleeve.userData.ringCount>=13,'sleeve surface should be smoothly subdivided');}
 let wristBalls=0;model.traverse(o=>{if(o.name==='Wrist transition')wristBalls++;});assert.equal(wristBalls,0,'a separate wrist sphere causes a visible hand/arm bulge');
 model.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
}));

test('new closed grip skin stays outside the handle core including triangle interiors',()=>withCanvas(()=>{
 const model=createViewmodel(THREE,()=>new THREE.Group()),hand=model.userData.hand,g=hand.geometry,p=g.attributes.position,index=g.index;
 let samples=0;
 for(let i=0;i<index.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+2));
  for(const v of [a,b,c,a.clone().add(b).add(c).multiplyScalar(1/3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5)]){
   if(v.y>.025&&v.y<.14){samples++;assert.ok(Math.hypot(v.x,v.z)>.012,'skin triangles must not cut through the solid grip center');}
   assert.ok(Math.abs(v.z)<.2,'the crop must retain only the right hand, not pieces of the torso or other arm');
  }
 }
 assert.ok(samples>5000);
}));
test('opponent racket meets a reachable shuttle with the root rotated and translated',()=>withCanvas(()=>{
 const model=createAthlete(THREE,()=>new THREE.Group());model.root.position.set(-1,0,-4);model.root.rotation.y=.7;
 for(const contact of [[-.3,2.1,.4],[.2,1.65,.55]]){
  model.update({swing:.135,shot:'clear',contact});model.root.updateMatrixWorld(true);
  const sweetSpot=model.racket.localToWorld(new THREE.Vector3(0,.51,0));
  const shuttle=model.root.localToWorld(new THREE.Vector3(...contact));
  assert.ok(sweetSpot.distanceTo(shuttle)<.001);
 }
}));
