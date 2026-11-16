import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRacketFrame,racketHeadPoint} from '../racket-frame.mjs';

test('aero-box frame has a thin physical section and continuous periodic position and normals',()=>{
 const g=createRacketFrame(T),p=g.attributes.position,n=g.attributes.normal,size=g.boundingBox.getSize(new T.Vector3());
 assert.ok(size.z>.006&&size.z<.0065);assert.ok(size.x>.20&&size.x<.22);assert.ok(size.y>.28&&size.y<.31);
 for(let i=0;i<=192;i++)for(const attribute of [p,n])assert.ok(new T.Vector3().fromBufferAttribute(attribute,i*17).distanceTo(new T.Vector3().fromBufferAttribute(attribute,i*17+16))<1e-5);
 for(let j=0;j<=16;j++)for(const attribute of [p,n])assert.ok(new T.Vector3().fromBufferAttribute(attribute,j).distanceTo(new T.Vector3().fromBufferAttribute(attribute,192*17+j))<1e-5);
 assert.ok([...p.array,...n.array].every(Number.isFinite));
 for(let i=0;i<g.index.count;i+=3){const [a,b,c]=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,g.index.array[i+k])),normal=b.clone().sub(a).cross(c.clone().sub(a));const u=g.attributes.uv.getX(g.index.array[i]),center=new T.Vector3(...racketHeadPoint(u*Math.PI*2));assert.ok(normal.dot(a.clone().sub(center))>0,'faces must point away from beam core');}
});
