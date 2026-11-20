import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ARENA,arenaSeats,ARENA_AUDIENCE_CAPACITY} from '../arena-layout.mjs';
import {createArenaBowl} from '../arena-bowl.mjs';
import {strokeTiming} from '../controls.mjs';
import {swingPose} from '../motion.mjs';

test('four stands fit the arena, face the court and leave real aisles and corner gaps',()=>{
 const seats=arenaSeats();assert.equal(seats.length,ARENA_AUDIENCE_CAPACITY);
 assert.equal(new Set(seats.map(s=>s.section)).size,4);
 const occupied=new Set();
 for(const p of seats){
  assert.ok(Math.abs(p.x)<ARENA.halfWidth-1&&Math.abs(p.z)<ARENA.halfLength-1);
  assert.ok(p.y+1.25<ARENA.roofY);
  const facing=new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),p.yaw);
  assert.ok(facing.dot(new T.Vector3(-p.x,0,-p.z))>0,'seated spectators face the court');
  const key=`${p.x.toFixed(2)},${p.z.toFixed(2)}`;assert.ok(!occupied.has(key));occupied.add(key);
  if(['W','E'].includes(p.section))assert.ok(Math.abs(p.z)<13&&[0,7.2,-7.2].every(a=>Math.abs(p.z-a)>=.48));
  else assert.ok(Math.abs(p.z)>14&&[0,9,-9].every(a=>Math.abs(p.x-a)>=.5));
 }
});

test('detailed spectators and architecture stay within a bounded GPU budget',()=>{
 const group=createArenaBowl(T,mergeGeometries);let calls=0,triangles=0;
 group.traverse(o=>{
  if(!o.isMesh)return;calls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
  o.geometry.computeBoundingBox();for(const n of [...o.geometry.boundingBox.min,...o.geometry.boundingBox.max])assert.ok(Number.isFinite(n));
  if(o.isInstancedMesh)for(const n of o.instanceMatrix.array)assert.ok(Number.isFinite(n));
 });
 assert.ok(calls<=14,`${calls} draws`);assert.ok(triangles<1200000,`${triangles} triangles`);
 assert.ok(group.userData.spectators>2400);
 group.userData.applyVenue({id:'test',accent:'#71469a'});assert.equal(group.userData.eventId,'test');
 group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('competition fascia and the Olympic safety floor stay neutral under event colours',()=>{
 const group=createArenaBowl(T,mergeGeometries);
 const fascia=group.children.map(mesh=>mesh.material).find(material=>material?.color?.getHexString()==='3c464b');
 assert.ok(fascia,'the competition fascia has a neutral graphite base');
 const base=new T.Color('#3c464b');
 for(const color of ['#71469a','#b88de0','#c6a7f2','#e66b4d']){
  group.userData.applyVenue({id:color,accent:color});
  assert.equal(group.userData.eventId,color);
  for(const channel of ['r','g','b'])
   assert.ok(Math.abs(fascia.color[channel]-base[channel])<.075, color+' should not tint the fascia purple');
 }
 group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
});

test('compact strokes return to ready sooner and meet the shuttle at their actual contact times',()=>{
 for(const kind of ['net','netcross','push','drive','netkill','lift','clear','drop','smash','slicesmash']){
  const timing=strokeTiming(kind),contact=[.30,.03,-1.1];
  assert.ok(timing.contact<=.07&&timing.recovery<=.4);
  const pose=swingPose({elapsed:timing.contact,contactTime:timing.contact,contact,kind});
  const head=new T.Vector3(0,.4896,0).applyEuler(new T.Euler(...pose.rotation)).add(new T.Vector3(...pose.position));
  assert.ok(head.distanceTo(new T.Vector3(...contact))<1e-6,kind);
  assert.deepEqual(swingPose({elapsed:timing.recovery+.001,contactTime:timing.contact,kind}),swingPose({elapsed:0,kind}));
 }
 assert.ok(strokeTiming('net').recovery<strokeTiming('smash').recovery-.1);
 assert.equal(strokeTiming('clear',true).contact,.04);
});
