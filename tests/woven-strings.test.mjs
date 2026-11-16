import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWovenStrings,stringCrossing,STRING_PITCH,STRING_CROSS_PITCH,STRING_RADIUS} from '../woven-strings.mjs';
test('physical string crossings alternate over and under without penetrating one another',()=>{
 for(let i=0;i<22;i++)for(let j=0;j<21;j++){
  const vertical=stringCrossing('vertical',i,.51+(j-10)*STRING_CROSS_PITCH),horizontal=stringCrossing('horizontal',j,(i-10.5)*STRING_PITCH);
  assert.ok(Math.abs(vertical-horizontal)>STRING_RADIUS*2);
  assert.ok(Math.abs(vertical+horizontal)<1e-12);
  assert.ok(vertical*stringCrossing('vertical',i,.51+(j-9)*STRING_CROSS_PITCH)<0);
 }
});
test('near racket strings have bounded physical thickness, lit normals and two draws',()=>{
 const bed=createWovenStrings(T,{stencil:(x,y)=>Math.abs(x)<.03&&Math.abs(y-.51)<.04});
 assert.equal(bed.children.length,2);let triangles=0;
 for(const mesh of bed.children){const g=mesh.geometry;assert.equal(mesh.isMesh,true);assert.ok(g.attributes.normal);triangles+=g.index.count/3;for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));g.computeBoundingBox();assert.ok(g.boundingBox.max.z-g.boundingBox.min.z<.0015);assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<.20);
  for(let i=0;i<g.index.count;i+=3){const a=new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i)),b=new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i+1)),c=new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i+2)),n=new T.Vector3().fromBufferAttribute(g.attributes.normal,g.index.getX(i));assert.ok(b.sub(a).cross(c.sub(a)).dot(n)>0,'string faces must face their outward normals');}
 }
 assert.ok(triangles<30000,`${triangles} triangles must stay below near-racket budget`);
});
