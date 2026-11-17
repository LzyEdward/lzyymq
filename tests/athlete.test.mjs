import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAthlete} from '../athlete.mjs';

test('player avatar can jump, reset planted feet and hold a serve without lifting its floor shadow',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})};
 try{
  const avatar=createAthlete(THREE,()=>new THREE.Group());
  avatar.root.position.set(2,0,5);avatar.root.rotation.y=Math.PI;avatar.resetFeet();avatar.update({dt:1/60});avatar.root.updateMatrixWorld(true);
  const grounded=avatar.bones['foot.R'].getWorldPosition(new THREE.Vector3()).y;
  avatar.root.position.y=.8;avatar.update({dt:1/60,jumpHeight:.8,supportContact:[.2,1.1,.7]});avatar.root.updateMatrixWorld(true);
  const airborne=avatar.bones['foot.R'].getWorldPosition(new THREE.Vector3()).y;
  assert.ok(airborne-grounded>.65&&airborne-grounded<.95);
  for(const shadow of avatar.root.children.filter(o=>o.isMesh)){
   assert.ok(Math.abs(shadow.getWorldPosition(new THREE.Vector3()).y-.01)<.003);
  }
  avatar.root.position.set(-2,0,1);avatar.resetFeet();avatar.update({dt:1/60});avatar.root.updateMatrixWorld(true);
  assert.ok(Math.abs(avatar.bones['foot.R'].getWorldPosition(new THREE.Vector3()).x+2)<.6);
  avatar.setKit('linDan08');assert.equal(avatar.root.userData.kit,'linDan08');
  assert.ok(avatar.skeleton.boneMatrices.every(Number.isFinite));
 }finally{globalThis.document=previous;}
});

test('articulated athlete has human proportions, finite surfaces and independently moving knees/elbows',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})};
  try {
    const model=createAthlete(THREE,()=>new THREE.Group());
    const bounds=new THREE.Box3().setFromObject(model.root),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.y>1.7&&size.y<1.95,`height ${size.y}`);assert.equal(model.knees.length,2);assert.equal(model.elbows.length,2);
    let meshes=0;
    model.root.traverse(o=>{if(o.isMesh){meshes++;for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});
    assert.equal(model.skeleton.bones.length,48);
    assert.equal(model.meshes.length,5);
    const cloth=model.torso.geometry,coincident=new Map();
    assert.equal(cloth.attributes.necklineDistance.count,cloth.attributes.position.count);
    for(const id of new Set(cloth.index.array)){
      const p=new THREE.Vector3().fromBufferAttribute(cloth.attributes.position,id),n=new THREE.Vector3().fromBufferAttribute(cloth.attributes.normal,id),key=p.toArray().map(x=>x.toFixed(5)).join(',');
      if(coincident.has(key))assert.ok(n.distanceTo(coincident.get(key))<1e-6,'a UV seam must not split cloth normals');else coincident.set(key,n);
    }
    assert.ok(model.meshes[1].geometry.index.count>45000);
    for(const mesh of model.meshes){
      const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
      for(let i=0;i<weights.count;i++){
        const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);assert.ok(Math.abs(sum-1)<1e-5);
        assert.ok(indices.getX(i)<48&&indices.getY(i)<48&&indices.getZ(i)<48&&indices.getW(i)<48);
      }
    }
    const before=model.wrists[1].getWorldPosition(new THREE.Vector3());
    model.update({speed:4,time:1,dt:.1,swing:.22,lateral:2});
    assert.notEqual(model.knees[0].rotation.x,model.knees[1].rotation.x);
    model.root.updateMatrixWorld(true);
    const after=model.wrists[1].getWorldPosition(new THREE.Vector3());assert.ok(after.distanceTo(before)>.12);
    assert.ok(model.bones['foot.R'].getWorldPosition(new THREE.Vector3()).y<.20);
    assert.ok(model.root.matrixWorld.elements.every(Number.isFinite));
  } finally {globalThis.document=previous;}
});

test('net choices use separate forehand/backhand contacts and crossover steps',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})};
  try{
    const model=createAthlete(THREE,()=>new THREE.Group());
    const wrist=variant=>{
      model.update({swing:.2,shot:'net',lunge:.8,netVariant:variant});
      model.root.updateWorldMatrix(true,true);
      return model.wrists[1].getWorldPosition(new THREE.Vector3());
    };
    const forehand=wrist('正手放网'),backhand=wrist('反手 · 勾对角'),push=wrist('推追身');
    assert.ok(forehand.distanceTo(backhand)>.04);
    assert.ok(forehand.distanceTo(push)>.04);
    const foot=crossover=>{
      model.update({speed:4,time:.2,dt:.02,lateral:2,forward:-1,crossover});
      model.root.updateWorldMatrix(true,true);
      return model.bones['foot.R'].getWorldPosition(new THREE.Vector3());
    };
    const sideStep=foot(false),crossStep=foot(true);
    assert.ok(sideStep.distanceTo(crossStep)>.2);
  }finally{globalThis.document=previous;}
});

test('net drops, brushes, pushes and net kills use distinct torso and racket poses',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})};
 try{
  const model=createAthlete(THREE,()=>new THREE.Group());
  const pose=variant=>{
   model.update({swing:.19,shot:variant.includes('扑')?'netkill':'net',lunge:.82,netVariant:variant});
   model.root.updateWorldMatrix(true,true);
   return {torso:model.bones.spine03.rotation.y,racket:model.racket.getWorldQuaternion(new THREE.Quaternion())};
  };
  const straight=pose('正手放网'),hook=pose('勾对角'),brush=pose('搓网'),push=pose('推追身'),kill=pose('扑球'),backhand=pose('反手封网');
  assert.ok(Math.abs(straight.torso-hook.torso)>.08);
  for(const [name,next] of [['勾对角',hook],['搓网',brush],['推追身',push],['扑球',kill],['反手封网',backhand]])assert.ok(straight.racket.angleTo(next.racket)>.035,`Net pose too similar for ${name}: ${straight.racket.angleTo(next.racket)}`);
  assert.ok(Math.abs(brush.racket.angleTo(push.racket))>.04);
  assert.ok(model.root.matrixWorld.elements.every(Number.isFinite));
 }finally{globalThis.document=previous;}
});
