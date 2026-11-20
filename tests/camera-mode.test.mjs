import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraMode,toggleCameraMode,orbitLook,thirdPersonPose,thirdPersonLift,thirdPersonFov,shuttleScreenCue,avatarObstruction,avatarSwingTime} from '../camera-mode.mjs';
import {strokeTiming} from '../controls.mjs';

test('camera modes validate stored preferences and toggle both ways',()=>{
 assert.equal(cameraMode(undefined),'third');assert.equal(cameraMode('broken'),'third');
 assert.equal(toggleCameraMode('first'),'third');assert.equal(toggleCameraMode('third'),'first');
});
test('shoulder view separates the player from the central net while keeping full court in view',()=>{
 const player={x:0,z:4.4},pose=thirdPersonPose({player,framing:'wide'}),camera=new THREE.PerspectiveCamera(thirdPersonFov(0),16/9,.05,100);
 camera.position.set(...Object.values(pose.position));camera.lookAt(...Object.values(pose.target));camera.updateMatrixWorld(true);
 const torso=new THREE.Vector3(0,1.25,4.4).project(camera),net=new THREE.Vector3(0,1.52,0).project(camera);
 assert.ok(net.x-torso.x>.045,'ball lane should sit away from the player silhouette');
 for(const x of [-3.05,3.05])for(const z of [-6.7,6.7]){
  const corner=new THREE.Vector3(x,0,z).project(camera);
  assert.ok(Math.abs(corner.x)<1&&Math.abs(corner.y)<1,'court corner should remain visible');
 }
});
test('avatar occlusion discriminates low balls behind the silhouette from clear shots',()=>{
 const player={x:0,z:4.4},eye=thirdPersonPose({player}).position;
 const behind={x:-(eye.x-player.x)*.15,y:1.21-(eye.y-1.21)*.15,z:player.z-(eye.z-player.z)*.15};
 assert.ok(avatarObstruction(eye,behind,player)>.9,'torso blocks center of the ray');
 assert.equal(avatarObstruction(eye,{...behind,x:behind.x+.65},player),0);
 assert.equal(avatarObstruction(eye,{...behind,y:6},player),0);
 assert.equal(avatarObstruction(eye,{x:.05,y:1.2,z:5.6},player),0,'avatar is behind shuttle');
 assert.equal(avatarObstruction(eye,behind,player,1.7),0,'airborne player clears low ball');
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
  const pose=thirdPersonPose({player,lift}),camera=new THREE.PerspectiveCamera(thirdPersonFov(lift),aspect,.05,100);
  camera.position.set(...Object.values(pose.position));camera.lookAt(...Object.values(pose.target));camera.updateMatrixWorld(true);
  for(const [name,p] of [['feet',[0,.05,z]],['head',[0,1.85,z]],['shuttle',[ball.x,ball.y,ball.z]],['net',[0,1.52,0]]]){
   const point=new THREE.Vector3(...p).project(camera);
   assert.ok(Math.abs(point.x)<.99&&Math.abs(point.y)<.99&&point.z<1,`${name}, aspect=${aspect}, z=${z}, height=${height}: ${point.toArray()}`);
  }
 }
 assert.equal(thirdPersonLift({player:{x:0,z:4},ball:{x:0,y:10,z:4},enabled:false}),0);
});
test('close camera shows the player larger and gives way to an overhead clear',()=>{
 const player={x:.45,z:4.45};
 const span=(framing,lift)=>{
  const {position,target}=thirdPersonPose({player,framing,lift});
  const camera=new THREE.PerspectiveCamera(thirdPersonFov(lift),16/9,.05,100);
  camera.position.set(...Object.values(position));camera.lookAt(...Object.values(target));camera.updateMatrixWorld(true);
  return new THREE.Vector3(player.x,1.8,player.z).project(camera).y-new THREE.Vector3(player.x,.05,player.z).project(camera).y;
 };
 assert.ok(span('near',0)>span('wide',0)*1.32);
 assert.ok(span('near',3)<span('near',0));
});
test('shuttle edge marker preserves direction past the camera and clears on reentry',()=>{
 assert.equal(shuttleScreenCue({x:.1,y:0,z:-5},73,1.6).edge,false);
 const right=shuttleScreenCue({x:3,y:1,z:-1},73,1.6);
 assert.ok(right.edge&&right.x>0&&right.y>0&&right.angle>0&&right.angle<90);
 const top=shuttleScreenCue({x:0,y:9,z:-3},73,1.6);
 assert.ok(top.edge&&top.y>0&&top.angle===0);
 assert.equal(shuttleScreenCue({x:0,y:0,z:4},73,1.6).angle,180);
});
test('an out-of-frame shuttle retains the correct side when it passes behind the player camera',()=>{
 const behindRight=shuttleScreenCue({x:3,y:1,z:2},77,16/9);
 const behindLeft=shuttleScreenCue({x:-3,y:1,z:2},77,16/9);
 assert.ok(behindRight.edge&&behindLeft.edge);
 assert.ok(behindRight.x<0&&behindLeft.x>0,'screen arrow reverses to point back toward the shuttle');
 assert.ok(behindRight.y<0&&behindLeft.y<0,'a shuttle behind the player points toward the bottom edge');
});
test('all player strokes visually contact at actual gameplay time and recover monotonically',()=>{
 for(const kind of ['auto','clear','drop','smash','net','push','netcross','slicesmash','slicedrop','serve']){
  const timing=strokeTiming(kind),contact=kind==='serve'?.2:.05,end=Math.max(timing.recovery,contact+.15);
  assert.equal(avatarSwingTime(0,contact,end),0);assert.equal(avatarSwingTime(contact,contact,end),.135);
  assert.ok(Math.abs(avatarSwingTime(end,contact,end)-.55)<1e-9);
  let previous=0;for(let i=1;i<=300;i++){const current=avatarSwingTime(end*i/300,contact,end);assert.ok(current>=previous);previous=current;}
 }
});
