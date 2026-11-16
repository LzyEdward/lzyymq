import test from 'node:test';
import assert from 'node:assert/strict';
import {freeLook,mouseRadiansPerPixel,normalizeLanding,landingFromMap,moveLanding,LANDING_PRESETS} from '../aiming.mjs';
import {shotTarget,strokeOutcome} from '../gameplay.mjs';
import {solveShot,predict} from '../physics.mjs';

test('relative mouse look preserves position without input and permits overhead views',()=>{
 const start={yaw:.4,pitch:.3};assert.deepEqual(freeLook(start,0,0),start);
 assert.ok(freeLook(start,100,-100).yaw<start.yaw);assert.ok(freeLook(start,100,-100).pitch>start.pitch);
 let v=start;for(let i=0;i<20;i++)v=freeLook(v,0,-100);assert.equal(v.pitch,1.545);
});
test('mouse look is linear across event sizes and sensitivity scales predictably',()=>{
 const start={yaw:0,pitch:0};
 const one=freeLook(start,500,100,1),many=[100,100,100,100,100].reduce((v,dx)=>freeLook(v,dx,20,1),start);
 assert.ok(Math.abs(one.yaw-many.yaw)<1e-12);assert.ok(Math.abs(one.pitch-many.pitch)<1e-12);
 const half=freeLook(start,100,0,.5),normal=freeLook(start,100,0,1);
 assert.ok(Math.abs(half.yaw*2-normal.yaw)<1e-12);
 assert.ok(Math.abs(normal.yaw+mouseRadiansPerPixel(900,69)*100)<1e-12);
 assert.ok(mouseRadiansPerPixel(900,69)>mouseRadiansPerPixel(1200,69));
 assert.ok(Math.abs(mouseRadiansPerPixel(900,69,2)-mouseRadiansPerPixel(900,69)*2)<1e-12);
});
test('mouse mapping uses the actual viewport aspect ratio and keeps vertical screen scale exact',()=>{
 const wide=mouseRadiansPerPixel(900,69,1,1600,'x');
 const taller=mouseRadiansPerPixel(900,69,1,1200,'x');
 const vertical=mouseRadiansPerPixel(900,69,1,1600,'y');
 assert.ok(wide<taller,'wider displays need fewer radians per horizontal pixel');
 assert.ok(Math.abs(vertical*900-69*Math.PI/180)<1e-12);
 assert.ok(mouseRadiansPerPixel(900,69,1,1600,'x')*1600<Math.PI);
 const turn=freeLook({yaw:0,pitch:0},1600,0,1,900,69,1600);
 assert.ok(turn.yaw<0);
});
test('opponent map and relative aiming keep left, right, front and rear in court coordinates',()=>{
 assert.ok(landingFromMap(0,0).x<0);assert.ok(landingFromMap(1,0).x>0);
 assert.ok(landingFromMap(.5,0).z<landingFromMap(.5,1).z-5);
 assert.deepEqual(moveLanding({x:0,z:-4.7},100,-40),{x:1.2,z:-5.34});
 assert.deepEqual(normalizeLanding({x:99,z:-99}),{x:2.48,z:-6.3});
});
test('selected landing coordinates stay identical across shot types and contact grades',()=>{
 for(const p of LANDING_PRESETS)for(const kind of ['clear','drop','smash','lift','drive'])for(const quality of [.55,.8,1]){
  const result=shotTarget({aim:p.x/2.45,depth:p.z,kind,quality,originX:-2});
  assert.ok(Math.abs(result.x-p.x)<1e-12);assert.equal(result.z,p.z);
 }
});
test('clean strokes land near each of the six requested zones without mirroring sides',()=>{
 for(const p of LANDING_PRESETS){
  const origin={x:.1,y:2.1,z:4},kind=p.z>-3?'drop':'clear';
  const shot=strokeOutcome({position:origin,player:{x:0,z:4.8},kind,target:p,speed:0,stamina:100});
  assert.equal(shot.fault,null);
  const end=predict(origin,solveShot(origin,shot.target,kind),-1).landing;
  assert.ok(Math.hypot(end.x-p.x,end.z-p.z)<.26,JSON.stringify({p,end}));
  if(p.x)assert.equal(Math.sign(end.x),Math.sign(p.x));
 }
});
