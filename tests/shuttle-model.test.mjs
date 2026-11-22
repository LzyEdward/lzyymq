import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createShuttleModel,shuttleVisualScale} from '../shuttle-model.mjs';

test('sixteen curved feather vanes share five draws and stay in real shuttle dimensions',()=>{
 const model=createShuttleModel(THREE,mergeGeometries);
 assert.equal(model.userData.featherCount,16);assert.ok(model.children.length<=5,'feather detail must not cost one draw per feather');
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.y>.08&&size.y<.105);assert.ok(size.x>.06&&size.x<.075);assert.ok(bounds.min.y<-.02,'cork points down along the collision axis');
 model.traverse(o=>{if(o.geometry)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
});

test('contact stays life-size and apparent width decreases across the full flight',()=>{
 assert.equal(shuttleVisualScale(.75),1);
 const focalLength=720/(2*Math.tan(69*Math.PI/360));
 const width=depth=>shuttleVisualScale(depth)*.064*focalLength/depth;
 for(let depth=1;depth<20;depth+=.25)assert.ok(width(depth)>width(depth+.25));
 assert.ok(width(5)>2*width(13),'the midcourt and baseline silhouettes must differ');
 assert.ok(width(13)>4,'preserve the far silhouette at 720p');
});
