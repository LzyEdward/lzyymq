import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {framePaint,frameFinishPixels} from '../racket-finish.mjs';
import {createRacketModel,disposeRacketModel} from '../racket-model.mjs';
import {RACKET_SKINS} from '../racket-catalog.mjs';
import {courtRelief,createCourtRelief} from '../court-surface.mjs';

test('lacquer paint wraps seamlessly, keeps navy crown and an asymmetric orange shoulder',()=>{
 for(const v of [0,.17,.5,.83,1])assert.deepEqual(framePaint(0,v),framePaint(1,v));
 const crown=framePaint(.2,.25).rgb,shoulder=framePaint(.06,.25).rgb;
 assert.ok(crown[2]>crown[0]*2);assert.ok(shoulder[0]>shoulder[2]*3);
 const p=frameFinishPixels(64,16);assert.equal(p.color.length,64*16*4);
 for(let i=0;i<p.roughness.length;i+=4){assert.ok(p.roughness[i+1]>65);assert.equal(p.roughness[i],p.roughness[i+1]);assert.equal(p.roughness[i+3],255);}
});

test('racket finish adds no geometry and all textures are released once on skin replacement',()=>{
 for(const skin of Object.keys(RACKET_SKINS)){
  const racket=createRacketModel(T,{skin,player:true}),owned=new Set(),counts=new Map();
  racket.traverse(o=>{if(o.geometry)owned.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){owned.add(m);for(const t of Object.values(m))if(t?.isTexture)owned.add(t);}});
  for(const resource of owned)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
  const frame=racket.getObjectByName('Compact isometric painted frame');
  assert.equal(frame.geometry.attributes.position.count,193*17);
  assert.equal(frame.geometry.index.count,192*16*6);
  assert.equal(frame.material.map.colorSpace,T.SRGBColorSpace);assert.equal(frame.material.roughnessMap.image.data[1]>65,true);
  disposeRacketModel(racket);assert.equal(counts.size,owned.size);assert.ok([...counts.values()].every(n=>n===1));
 }
});

test('PVC relief has small normalized normals, deterministic output and mipmapped physical scale',()=>{
 const p=courtRelief();assert.deepEqual(p,courtRelief());
 for(let i=0;i<p.normal.length;i+=4){const x=p.normal[i]/255*2-1,y=p.normal[i+1]/255*2-1,z=p.normal[i+2]/255*2-1;assert.ok(Math.abs(Math.hypot(x,y,z)-1)<.012);assert.ok(z>.95);}
 const map=createCourtRelief(T);assert.deepEqual(map.repeat.toArray(),[39.5,81]);assert.equal(map.generateMipmaps,true);assert.equal(map.minFilter,T.LinearMipmapLinearFilter);map.dispose();
});
