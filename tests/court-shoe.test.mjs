import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCourtShoe,shoeUpperHeight} from '../court-shoe.mjs';
test('court shoe has a closed shaped last, floor clearance and a bounded draw budget',()=>{
 const shoe=createCourtShoe(T,{mergeGeometries});let calls=0,triangles=0;
 shoe.traverse(m=>{if(m.isMesh){calls++;triangles+=m.geometry.index.count/3*(m.isInstancedMesh?m.count:1);for(const p of m.geometry.attributes.position.array)assert.ok(Number.isFinite(p));}});
 assert.ok(calls<=6,`${calls} draws for a detailed articulated shoe`);assert.ok(triangles<4500);
 const box=new T.Box3().setFromObject(shoe),size=box.getSize(new T.Vector3());assert.ok(size.z>.28&&size.z<.30);assert.ok(size.x<.13);assert.ok(box.min.y>=-.063001);assert.ok(box.max.y<.065);
 for(const name of ['Shaped mesh upper','Rolled gum outsole']){
  const g=shoe.getObjectByName(name).geometry,edges=new Map();for(let i=0;i<g.index.count;i+=3)for(let j=0;j<3;j++){const a=g.index.getX(i+j),b=g.index.getX(i+(j+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));
 }
 assert.ok(shoeUpperHeight(0,.01)>shoeUpperHeight(0,.15)+.02,'instep must rise above the toe box');
});
