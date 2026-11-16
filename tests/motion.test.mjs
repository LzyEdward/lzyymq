import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {swingPose,moveVelocity,groundedCameraOffset} from '../motion.mjs';

test('the racket sweet spot meets the exact contact point for every stroke',()=>{
 for(const kind of ['clear','drive','drop','smash','lift','serve','net','push','netkill']){
  const contact=[.42,.08,-1.2],pose=swingPose({elapsed:.095,kind,contact});
  const head=new THREE.Vector3(0,.4896,0).applyEuler(new THREE.Euler(...pose.rotation)).add(new THREE.Vector3(...pose.position));
  assert.ok(head.distanceTo(new THREE.Vector3(...contact))<1e-6,kind);
 }
});
test('fast serve receive animation reaches the shuttle at its 40 ms contact time',()=>{
 const contact=[.22,-.08,-1.1],pose=swingPose({elapsed:.04,kind:'clear',contact,contactTime:.04});
 const head=new THREE.Vector3(0,.4896,0).applyEuler(new THREE.Euler(...pose.rotation)).add(new THREE.Vector3(...pose.position));
 assert.ok(head.distanceTo(new THREE.Vector3(...contact))<1e-6);
});

test('the swing carries continuous velocity through preparation, contact and follow-through',()=>{
 const h=1e-6;
 for(const kind of ['clear','smash','drop','slicesmash','slicedrop','net','netcross','push','netkill','serve']){
  for(const contactTime of [.04,.095,.2,.29]){
   const prep=contactTime<.07?Math.max(.012,contactTime*.48):.048,follow=Math.max(contactTime+.065,.255),end=Math.max(follow+.15,.46);
   for(const at of [prep,contactTime,follow])for(const property of ['position','rotation']){
    const before=swingPose({elapsed:at-h,kind,contactTime}),here=swingPose({elapsed:at,kind,contactTime}),after=swingPose({elapsed:at+h,kind,contactTime});
    const left=here[property].map((x,k)=>(x-before[property][k])/h),right=after[property].map((x,k)=>(x-here[property][k])/h);
    assert.ok(Math.hypot(...left.map((x,k)=>x-right[k]))<.03,`${kind} ${property} jumps at ${at}`);
    if(at===contactTime)assert.ok(Math.hypot(...left)>.01,`${kind} stops on contact`);
   }
   for(let t=.001;t<end+.01;t+=.002){const pose=swingPose({elapsed:t,kind,contactTime});assert.ok([...pose.position,...pose.rotation].every(Number.isFinite));assert.ok(pose.position[2]<-.5&&pose.position[2]>-1.8);}
  }
 }
});
test('different strokes have separate preparation and follow through, and return to idle',()=>{
 const overhead=swingPose({elapsed:.048,kind:'clear'}),low=swingPose({elapsed:.048,kind:'lift'});
 assert.ok(overhead.position[1]>low.position[1]+.3);
 const dropPrep=swingPose({elapsed:.048,kind:'drop'}),drivePrep=swingPose({elapsed:.048,kind:'drive'});
 const dropFinish=swingPose({elapsed:.31,kind:'drop'}),driveFinish=swingPose({elapsed:.31,kind:'drive'});
 assert.notDeepEqual(dropPrep.position,drivePrep.position);assert.notDeepEqual(dropFinish.rotation,driveFinish.rotation);
 assert.deepEqual(swingPose({elapsed:.6}),swingPose({elapsed:0}));
 for(const kind of ['clear','lift','drive'])for(let t=0;t<.5;t+=.001){const p=swingPose({elapsed:t,kind});assert.ok([...p.position,...p.rotation].every(Number.isFinite));}
});
test('net brush, push and net kill each use distinguishable compact swing arcs',()=>{
 const arcs=['net','push','netkill'].map(kind=>[swingPose({elapsed:.048,kind}),swingPose({elapsed:.31,kind})]);
 assert.notDeepEqual(arcs[0][0].rotation,arcs[1][0].rotation);
 assert.notDeepEqual(arcs[1][1].rotation,arcs[2][1].rotation);
});
test('serve has a distinct compact low-contact preparation',()=>{
 const serve=swingPose({elapsed:.048,kind:'serve'}),lift=swingPose({elapsed:.048,kind:'lift'});
 assert.notDeepEqual(serve.rotation,lift.rotation);
 assert.notDeepEqual(serve.position,lift.position);
});
test('movement accelerates quickly, brakes firmly, and does not depend on frame rate',()=>{
 let a=0,b=0;for(let i=0;i<12;i++)a=moveVelocity(a,5.25,1/120);for(let i=0;i<6;i++)b=moveVelocity(b,5.25,1/60);
 assert.ok(a>4.7);assert.ok(Math.abs(a-b)<1e-12);
 for(let i=0;i<12;i++)a=moveVelocity(a,0,1/120);assert.ok(a<.21);
 const reverse=moveVelocity(5.25,-5.25,.1);assert.ok(reverse<-4.7);
});
test('grounded camera stays quiet at rest and leans subtly with court movement',()=>{
 assert.deepEqual(groundedCameraOffset(),{x:0,y:0,z:0,roll:0});
 const moving=groundedCameraOffset({speed:5.25,lateral:4,forward:-2,phase:.8,intensity:.5});
 assert.ok(moving.x<0&&moving.z>0&&moving.y>0&&moving.roll<0);
 const full=groundedCameraOffset({speed:99,lateral:99,forward:99,phase:1,intensity:1});
 assert.ok(Object.values(full).every(Number.isFinite));assert.ok(Math.abs(full.roll)<=.018);
});
