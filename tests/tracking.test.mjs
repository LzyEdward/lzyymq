import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {trackAngles,stepTracking,angleDelta,highBallOffset,manualLookTakeover,stepHighBallOffset} from '../tracking.mjs';
import {freeLook} from '../aiming.mjs';
test('manual vertical input takes over the displayed lifted view without a jump or altered mouse scale',()=>{
 const lifted={pitch:1.1,manualPitch:-.03,autoPitchOffset:1.13};
 const manual=manualLookTakeover(lifted,40,10);
 assert.equal(manual.manualPitch,1.1);assert.equal(manual.autoPitchOffset,0);assert.equal(manual.manualLookUntil,10.65);
 const look=freeLook({yaw:.2,pitch:manual.manualPitch},0,40);
 const ordinary=freeLook({yaw:.2,pitch:lifted.pitch},0,40);
 assert.deepEqual(look,ordinary);assert.ok(look.pitch<lifted.pitch);
 assert.equal(manualLookTakeover(lifted,0,10).autoPitchOffset,lifted.autoPitchOffset,'horizontal input keeps overhead visibility');
 let offset=1;for(let i=0;i<60;i++)offset=stepHighBallOffset(offset,0,1/120);
 assert.ok(offset<.06,'view relaxes promptly after hitting the high ball');
});
test('head tracking sees an overhead or behind-head shuttle instead of clamping at 37 degrees',()=>{
 const eye={x:0,y:1.69,z:4};
 for(const ball of [{x:0,y:8,z:3.8},{x:1,y:7,z:5.4},{x:-2,y:6,z:1}]){
  const goal=trackAngles(eye,ball);let current={yaw:0,pitch:0};for(let i=0;i<60;i++)current=stepTracking(current,goal,1/120);
  const camera=new THREE.PerspectiveCamera(69,16/9,.045,100);camera.position.set(eye.x,eye.y,eye.z);camera.rotation.set(current.pitch,current.yaw,0,'YXZ');camera.updateMatrixWorld();
  const screen=new THREE.Vector3(ball.x,ball.y,ball.z).project(camera);assert.ok(Math.abs(screen.y)<.16&&Math.abs(screen.x)<.16,JSON.stringify(screen));
 }
 assert.ok(trackAngles(eye,{x:0,y:8,z:4}).pitch>1.5);
});
test('tracking wraps yaw by the shortest angle and is independent of frame subdivision',()=>{
 assert.ok(Math.abs(angleDelta(3.13,-3.13))<.03);
 const goal={yaw:-3.13,pitch:1.2};let a={yaw:3.13,pitch:0},b={...a};
 for(let i=0;i<60;i++)a=stepTracking(a,goal,1/120);for(let i=0;i<30;i++)b=stepTracking(b,goal,1/60);
 assert.ok(Math.abs(a.yaw-b.yaw)<1e-9&&Math.abs(a.pitch-b.pitch)<1e-9);
});
test('comfortable follow tracks overhead shuttles in both axes with a damped camera response',()=>{
 const eye={x:0,y:1.69,z:4},ball={x:.25,y:7.5,z:3.35},goal=trackAngles(eye,ball),start={yaw:0,pitch:-.03};
 const oneFrame=stepTracking(start,goal,1/60,8,8),snap=stepTracking(start,goal,1/60);
 assert.ok(Math.abs(oneFrame.yaw)<Math.abs(snap.yaw));
 assert.ok(oneFrame.pitch>start.pitch&&oneFrame.pitch<goal.pitch,'vertical follow begins smoothly, not as a snap');
 let current=start;for(let i=0;i<90;i++)current=stepTracking(current,goal,1/120,8,8);
 const camera=new THREE.PerspectiveCamera(69,16/9,.045,100);camera.position.set(eye.x,eye.y,eye.z);camera.rotation.set(current.pitch,current.yaw,0,'YXZ');camera.updateMatrixWorld();
 const screen=new THREE.Vector3(ball.x,ball.y,ball.z).project(camera);
 assert.ok(Math.abs(screen.x)<.2&&Math.abs(screen.y)<.2,`overhead shuttle should remain visible: ${screen.toArray()}`);
});
