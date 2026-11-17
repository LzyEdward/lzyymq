import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraMode,toggleCameraMode,orbitLook,thirdPersonPose,thirdPersonLift,avatarSwingTime} from '../camera-mode.mjs';
import {strokeTiming} from '../controls.mjs';

test('camera modes validate stored preferences and toggle both ways',()=>{
 assert.equal(cameraMode(undefined),'first');assert.equal(cameraMode('broken'),'first');
 assert.equal(toggleCameraMode('first'),'third');assert.equal(toggleCameraMode('third'),'first');
});
test('third-person camera stays above the floor and outside all four stands',()=>{
 for(const x of [-3.4,0,3.4])for(const z of [.65,4.4,7.35])for(const jump of [0,1.4])
 for(const yaw of [-10,0,10])for(const pitch of [-10,-.28,10])for(const lift of [0,3.2]){
  const {position,target}=thirdPersonPose({player:{x,z},jump,yaw,pitch,lift});
  assert.ok(Object.values(position).every(Number.isFinite));
  assert.ok(Math.abs(position.x)<=7.4&&position.z<=13.2&&position.z>=.7&&position.y>=2.4&&position.y<=10);
  assert.ok(Math.hypot(position.x-x,position.y-(1+jump),position.z-z)>2);
  assert.ok(target.y>=1.12);
 }
 assert.deepEqual(orbitLook({yaw:10,pitch:10}),{yaw:1.15,pitch:.32});
});
test('default framing shows whole player, net and overhead shuttle without mouse input',()=>{
 for(const aspect of [16/9,1,.65])for(const z of [.8,4.4,7.35])for(const height of [2,6,9]){
  const player={x:0,z},ball={x:.2,y:height,z:z-.5};
  const lift=thirdPersonLift({player,ball,enabled:true});
  const pose=thirdPersonPose({player,lift}),camera=new THREE.PerspectiveCamera(73,aspect,.05,100);
  camera.position.set(...Object.values(pose.position));camera.lookAt(...Object.values(pose.target));camera.updateMatrixWorld(true);
  for(const [name,p] of [['feet',[0,.05,z]],['head',[0,1.85,z]],['shuttle',[ball.x,ball.y,ball.z]],['net',[0,1.52,0]]]){
   const point=new THREE.Vector3(...p).project(camera);
   assert.ok(Math.abs(point.x)<.99&&Math.abs(point.y)<.99&&point.z<1,`${name}, aspect=${aspect}, z=${z}, height=${height}: ${point.toArray()}`);
  }
 }
 assert.equal(thirdPersonLift({player:{x:0,z:4},ball:{x:0,y:10,z:4},enabled:false}),0);
});
test('all player strokes visually contact at actual gameplay time and recover monotonically',()=>{
 for(const kind of ['auto','clear','drop','smash','net','push','netcross','slicesmash','slicedrop','serve']){
  const timing=strokeTiming(kind),contact=kind==='serve'?.2:.05,end=Math.max(timing.recovery,contact+.15);
  assert.equal(avatarSwingTime(0,contact,end),0);assert.equal(avatarSwingTime(contact,contact,end),.135);
  assert.ok(Math.abs(avatarSwingTime(end,contact,end)-.55)<1e-9);
  let previous=0;for(let i=1;i<=300;i++){const current=avatarSwingTime(end*i/300,contact,end);assert.ok(current>=previous);previous=current;}
 }
});
