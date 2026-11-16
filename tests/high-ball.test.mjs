import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {highBallOffset,stepHighBallOffset} from '../tracking.mjs';

test('vertical assistance keeps overhead clears in frame at standing and jumping eye heights',()=>{
 for(const jump of [0,.9])for(const fov of [45,69,85])for(const yaw of [0,1.2,-1.8])for(const depth of [.02,.3,2,9]){
  const eye={x:0,y:1.69+jump,z:4},ball={x:-Math.sin(yaw)*depth,y:7,z:4-Math.cos(yaw)*depth},manualPitch=-.03;
  const target=highBallOffset({eye,ball,yaw,manualPitch,fov});let offset=0;
  for(let i=0;i<60;i++)offset=stepHighBallOffset(offset,target,1/120);
  const camera=new T.PerspectiveCamera(fov,16/9,.045,100);camera.position.set(eye.x,eye.y,eye.z);camera.rotation.set(manualPitch+offset,yaw,0,'YXZ');camera.updateMatrixWorld();
  const screen=new T.Vector3(ball.x,ball.y,ball.z).project(camera);
  assert.ok(screen.y>.28&&screen.y<.48&&Math.abs(screen.x)<.001,JSON.stringify({jump,fov,yaw,depth,screen}));
 }
});
test('vertical assist respects free horizontal look, manual upward look, low balls and its off switch',()=>{
 const args={eye:{x:0,y:1.69,z:4},ball:{x:0,y:7,z:3},yaw:0,manualPitch:0};
 assert.ok(highBallOffset(args)>.9);
 assert.equal(highBallOffset({...args,enabled:false}),0);
 assert.equal(highBallOffset({...args,yaw:Math.PI}),0);
 assert.equal(highBallOffset({...args,manualPitch:1.5}),0);
 assert.equal(highBallOffset({...args,ball:{x:0,y:1,z:2}}),0);
 assert.ok(highBallOffset({...args,eye:{x:0,y:2.59,z:4}})<highBallOffset(args));
 assert.equal(stepHighBallOffset(.6,.8,0),.6);
});
test('vertical assist converges independently of display rate and releases smoothly',()=>{
 const simulate=hz=>{let a=0;for(let i=0;i<hz;i++)a=stepHighBallOffset(a,1.1,1/hz);for(let i=0;i<hz;i++)a=stepHighBallOffset(a,0,1/hz);return a;};
 assert.ok(Math.abs(simulate(30)-simulate(120))<1e-12);
 const after=stepHighBallOffset(.9,0,1/60);assert.ok(after<.9&&after>.8);
});
