import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {roofGeometry} from '../roof-structure.mjs';
import {ARENA} from '../arena-layout.mjs';
test('corrugated roof faces the court, covers the hall and stays within the static geometry budget',()=>{
 const g=roofGeometry(T);g.computeBoundingBox();
 assert.equal(g.boundingBox.max.x-g.boundingBox.min.x,ARENA.width);assert.equal(g.boundingBox.max.z-g.boundingBox.min.z,ARENA.length);
 assert.ok(g.boundingBox.max.y-g.boundingBox.min.y>.03);assert.ok(g.index.count/3<6000);
 for(let i=0;i<g.attributes.normal.count;i++)assert.ok(g.attributes.normal.getY(i)<-.95,'roof normal must face downward into the hall');
 for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));
});
