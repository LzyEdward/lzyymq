import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createShuttleModel} from '../shuttle-model.mjs';

test('sixteen curved feather vanes share five draws and stay in real shuttle dimensions',()=>{
 const model=createShuttleModel(THREE,mergeGeometries);
 assert.equal(model.userData.featherCount,16);assert.ok(model.children.length<=5,'feather detail must not cost one draw per feather');
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.y>.08&&size.y<.105);assert.ok(size.x>.06&&size.x<.075);assert.ok(bounds.min.y<-.02,'cork points down along the collision axis');
 model.traverse(o=>{if(o.geometry)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
});
