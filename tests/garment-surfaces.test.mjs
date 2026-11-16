import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../assets/athlete-data.mjs';
import {necklineDistances} from '../garment-surfaces.mjs';

test('collar follows welded neckline instead of UV seams or a floating ellipse',()=>{
 const {distances,segments}=necklineDistances(data.positions,data.indices1);
 assert.ok(segments.length>80&&segments.length<130);
 for(const [a,b] of segments)for(const p of [a,b])assert.ok(p[1]>1.49&&p[1]<1.55);
 const near=[];
 for(const id of new Set(data.indices1)){
  assert.ok(Number.isFinite(distances[id]));
  if(distances[id]<.00001)near.push(Array.from(data.positions.slice(id*3,id*3+3)));
  if(data.positions[id*3+1]<1.44)assert.equal(distances[id],1);
 }
 assert.ok(Math.max(...near.map(p=>p[1]))-Math.min(...near.map(p=>p[1]))>.04,'collar must match the non-planar real opening');
 assert.ok(near.some(p=>p[0]>.08)&&near.some(p=>p[0]<-.08)&&near.some(p=>p[2]>.08)&&near.some(p=>p[2]<-.06));
});
