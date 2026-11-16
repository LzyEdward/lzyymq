import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {RACKET_SKINS,racketSkin} from '../racket-catalog.mjs';
import {framePaint,frameFinishPixels} from '../racket-finish.mjs';
import {createRacketModel,disposeRacketModel} from '../racket-model.mjs';
import {WINDOW_BAYS,createHallContext} from '../hall-context.mjs';
import {ARENA} from '../arena-layout.mjs';

test('five referenced editions extend the existing collection and every finish is distinct and periodic',()=>{
 assert.equal(Object.keys(RACKET_SKINS).length,8);
 const additions=Object.values(RACKET_SKINS).filter(s=>s.reference);assert.equal(additions.length,5);
 const hashes=new Set();
 for(const [id,spec]of Object.entries(RACKET_SKINS)){
  for(const v of [0,.13,.5,.91,1])assert.deepEqual(framePaint(0,v,id),framePaint(1,v,id));
  for(const u of [0,.14,.4,.62,.94,1])assert.deepEqual(framePaint(u,0,id),framePaint(u,1,id));
  hashes.add(createHash('sha256').update(frameFinishPixels(128,32,id).color).digest('hex'));
  assert.ok(spec.model.includes(spec.mark));
 }
 assert.equal(hashes.size,8);assert.equal(racketSkin('missing'),RACKET_SKINS.astrox100zz);
 // Distinctive official colour blocking, rather than a flat colour substitution.
 const yellow=framePaint(.25,.25,'nanoflare1000z').rgb;assert.ok(yellow[0]>180&&yellow[1]>180&&yellow[2]<70);
 const green=framePaint(.25,.25,'astrox99pro').rgb;assert.ok(green[1]>green[0]*2);
 const silver=framePaint(.24,.25,'astrox88dpro').rgb;assert.ok(silver.every(n=>n>150));
});

test('skin selection preserves exact contact geometry and prints its own shaft model',()=>{
 const oldDocument=globalThis.document,labels=[];
 // Record the actual shaft canvas printing, independent of metadata.
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},fill(){},save(){},restore(){},translate(){},rotate(){},fillText:text=>labels.push(text)})})};
 try{
  let reference;
  for(const [id,spec]of Object.entries(RACKET_SKINS)){
   labels.length=0;const r=createRacketModel(T,{skin:id,player:true}),frame=r.getObjectByName('Compact isometric painted frame');
   const geometry=Array.from(frame.geometry.attributes.position.array);reference??=geometry;assert.deepEqual(geometry,reference);
   assert.deepEqual(r.userData.sweetSpot,[0,.51,0]);assert.equal(r.userData.skin,id);assert.ok(labels.includes(spec.model));
   assert.equal(r.getObjectByName('Cylindrical shaft graphics').userData.printedModel,spec.model);
   disposeRacketModel(r);
  }
 }finally{globalThis.document=oldDocument;}
});

test('exterior scenery has physical depth, bounded windows and a small static geometry budget',()=>{
 for(const z of WINDOW_BAYS)assert.ok(Math.abs(z)+2.25<ARENA.halfLength);
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createLinearGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},ellipse(){},fill(){}})})};
 try{
  const scene=new T.Scene();createHallContext(T,scene);let triangles=0;const mats=new Set();
  scene.traverse(o=>{if(!o.isMesh)return;mats.add(o.material);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<20000,`static context triangles: ${triangles}`);assert.equal(mats.size,9);
  const panoramas=scene.children.filter(o=>o.name.startsWith('Continuous outdoor panorama'));
  assert.equal(panoramas.length,2);assert.ok(panoramas.every(o=>Math.abs(o.position.x)===ARENA.halfWidth+7.5));
  const foreground=scene.children.filter(o=>o.name==='Foreground leaf cluster');assert.equal(foreground.length,144);
  assert.ok(foreground.every(o=>Math.abs(o.position.x)>24&&Math.abs(o.position.x)<29));
 }finally{globalThis.document=oldDocument;}
});
