import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {towelPoint,createSportsTowel} from '../sports-towel.mjs';
test('towel drapes continuously around the bench edge and stays above ground',()=>{
 for(const u of [0,.25,.5,.75,1]){
  let previous=towelPoint(u,0);
  for(let v=.001;v<=1;v+=.001){const p=towelPoint(u,v);assert.ok(Math.hypot(...p.map((x,i)=>x-previous[i]))<.0015);assert.ok(p[1]>.23);previous=p;}
  for(const edge of [.56,.67]){const a=towelPoint(u,edge-1e-8),b=towelPoint(u,edge+1e-8);assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))<1e-6);}
  assert.ok(towelPoint(u,0)[1]>.512);assert.ok(towelPoint(u,1)[1]<.25);
 }
});
test('draped towel is a single finite mesh with correctly facing cloth normals',()=>{
 const mesh=createSportsTowel(T,new T.MeshStandardMaterial()),g=mesh.geometry;
 assert.equal(g.index.count,32*64*6);assert.ok(g.attributes.position.count<2200);
 for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n));
 const n=new T.Vector3().fromBufferAttribute(g.attributes.normal,16);assert.ok(n.y>.9);
});
