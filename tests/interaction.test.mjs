import test from 'node:test';
import assert from 'node:assert/strict';
import {JumpMotion,MovementOwnership,keyCommand,pointerCommand} from '../interaction.mjs';
import {swingWindow} from '../controls.mjs';

test('standard controls separate jumping from hitting, and mouse buttons keep fixed meanings',()=>{
 assert.deepEqual(keyCommand('Space'),{action:'jump'});
 assert.equal(keyCommand('KeyQ').action,'jump');assert.deepEqual(keyCommand('KeyJ'),{action:'hit',kind:'auto'});
 assert.deepEqual(keyCommand('KeyE'),{action:'hit',kind:'drop'});assert.deepEqual(keyCommand('KeyK'),{action:'hit',kind:'clear'});
 assert.equal(pointerCommand(0).kind,'auto');assert.equal(pointerCommand(2).kind,'smash');assert.equal(keyCommand('KeyL').kind,'smash');
 for(const [code,kind] of Object.entries({Digit1:'auto',Digit2:'clear',Digit3:'drop',Digit4:'smash',Digit5:'net',Digit6:'push',Digit7:'netcross',Digit8:'slicesmash',Digit9:'slicedrop',Numpad1:'auto',Numpad2:'clear',Numpad3:'drop',Numpad4:'smash',Numpad5:'net',Numpad6:'push',Numpad7:'netcross',Numpad8:'slicesmash',Numpad9:'slicedrop'}))assert.deepEqual(keyCommand(code),{action:'hit',kind});
});
test('jump starts immediately, rises about 95 cm and lands consistently at different frame sizes',()=>{
 for(const dt of [1/120,1/60]){
  const j=new JumpMotion();j.request();assert.equal(j.step(dt).launched,true);let peak=j.height,landed=false;
  for(let i=0;i<90;i++){const frame=j.step(dt);peak=Math.max(peak,j.height);landed||=frame.landed;}
  assert.ok(peak>.94&&peak<.96);assert.ok(landed);assert.equal(j.height,0);assert.equal(j.count,1);
 }
});
test('jump buffer accepts a near-landing tap without double jumping or spending unavailable stamina',()=>{
 const j=new JumpMotion();j.request();j.step(1/120);for(let i=0;i<70;i++)j.step(1/120);
 j.request();assert.equal(j.step(1/120).launched,false);
 let launches=0;for(let i=0;i<25;i++)launches+=Number(j.step(1/120).launched);
 assert.equal(launches,1);assert.equal(j.count,2);
 const exhausted=new JumpMotion();exhausted.request();assert.equal(exhausted.step(.02,4).launched,false);
 exhausted.step(.2,4);assert.equal(exhausted.step(.01,100).launched,false);
});
test('automatic movement cannot reclaim a manually chosen position during the same incoming shot',()=>{
 const o=new MovementOwnership(),incoming={phase:'rally',lastHitter:'opponent',rally:2};
 assert.equal(o.step({...incoming,active:true}),true);for(let i=0;i<300;i++)assert.equal(o.step(incoming),true);
 assert.equal(o.step({phase:'rally',lastHitter:'player',rally:3}),true);
 assert.equal(o.step({...incoming,rally:4}),false);
});
test('a fresh tap outside actual reach waits; a descending ball near the racket starts a swing',()=>{
 const c={position:{x:0,y:2,z:1.2},velocity:{x:0,y:-1,z:1},player:{x:0,z:4.5},active:true,lastHitter:'opponent',assisted:true,age:0,yaw:0};
 assert.equal(swingWindow(c),null);
 assert.ok(swingWindow({...c,position:{x:0,y:2,z:3.3}}));
});
test('jumping opens an elevated smash contact window instead of waiting for standing height',()=>{
 const c={position:{x:0,y:3.8,z:3.6},velocity:{x:0,y:-1,z:.1},player:{x:0,z:4.4},active:true,lastHitter:'opponent',assisted:true,kind:'smash',age:1,yaw:0};
 assert.equal(swingWindow(c),null);assert.ok(swingWindow({...c,jump:.85}));
});
