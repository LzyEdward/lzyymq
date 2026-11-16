import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRacketModel} from '../racket-model.mjs';
test('compact 100ZZ keeps the contact point and uses real slim shaft and grommets',()=>{
 const r=createRacketModel(THREE,{player:true});
 assert.deepEqual(r.userData.sweetSpot,[0,.51,0]);
 const shaft=r.getObjectByName('Hyper Slim solid shaft');assert.ok(shaft.geometry.parameters.radiusTop<=.0032);
 assert.equal(r.getObjectByName('76 black grommets').count,76);
 const frame=r.getObjectByName('Compact isometric painted frame');frame.geometry.computeBoundingBox();const size=frame.geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(size.x>.20&&size.x<.22);assert.ok(size.y>.28&&size.y<.31);
 assert.ok(r.getObjectByName('Yonex string stencil').geometry.attributes.position.count>100);
 assert.ok(!r.children.some(o=>o.geometry?.type==='PlaneGeometry'),'branding must wrap around the narrow shaft');
});
