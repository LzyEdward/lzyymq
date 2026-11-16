import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {advance,solveShot,groundCrossing,createGroundMotion,stepGroundMotion,COURT} from '../physics.mjs';
import {techniqueTarget,strokeOutcome} from '../gameplay.mjs';
import {normalizeSkills,effectiveOpponentLevel,playerStatsFromInputs} from '../player-styles.mjs';
import {OPPONENT_LEVELS} from '../competition.mjs';
import {opponentReceiveMissChance,opponentStrokeExecution,opponentFootwork} from '../opponent-ai.mjs';
import {canContact} from '../controls.mjs';
import {swingPose} from '../motion.mjs';
import {keyCommand,pointerCommand} from '../interaction.mjs';

function fly(origin,target,kind,options={}){
 const v=solveShot(origin,target,kind,options),velocity={...v},p={...origin};let apex=p.y,netY=null,time=0;
 for(let i=0;i<1800;i++){
  const prev={...p};advance(p,velocity,1/240);time+=1/240;apex=Math.max(apex,p.y);
  if(prev.z*p.z<=0&&prev.z!==p.z)netY=prev.y+(p.y-prev.y)*prev.z/(prev.z-p.z);
  const hit=groundCrossing(prev,p);if(hit){Object.assign(p,hit);break;}
 }
 return {landing:p,netY,time,apex,velocity,v};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('cross-court techniques choose the opposite contact lane and never override manual placement',()=>{
 for(const x of [-1.9,1.9])for(const kind of ['netcross','slicesmash','slicedrop']){
  const t=techniqueTarget({position:{x,z:1.2},kind});assert.equal(Math.sign(t.x),-Math.sign(x));assert.ok(Math.abs(t.x)>2);
  const manual={x:.65,z:-4.9};assert.deepEqual(techniqueTarget({position:{x,z:1.2},kind,manual}),manual);
 }
 assert.ok(techniqueTarget({position:{x:1.8,z:1.2},kind:'net'}).x>1.6);
});

test('front-court hooks cross the tape low and land in the diagonal front corner on both sides',()=>{
 for(const side of [-1,1])for(const x of [-1.9,1.9])for(const y of [.9,1.35,1.8]){
  const o={x,y,z:side*1.3},t=techniqueTarget({position:o,kind:'netcross'});t.z=-side*.85;
  const f=fly(o,t,'netcross');assert.ok(f.netY>COURT.netHeight&&f.netY<COURT.netHeight+.16,JSON.stringify(f));
  assert.ok(distance(f.landing,t)<.06);assert.equal(Math.sign(f.landing.x),-Math.sign(x));
 }
});

test('rear-court drops no longer inherit a clear-like arc and land short',()=>{
 for(const kind of ['drop','slicedrop']){
  const o={x:1.8,y:2.9,z:5},t=techniqueTarget({position:o,kind}),f=fly(o,t,kind);
  assert.ok(f.apex<3.45);assert.ok(f.netY>COURT.netHeight&&f.netY<COURT.netHeight+.25);
  assert.ok(distance(f.landing,t)<.06);assert.ok(f.time<1.35);
  if(kind==='slicedrop')assert.ok(f.landing.x< -2);
 }
});

test('balanced overhead drop skims downwards and poor contact floats higher',()=>{
 for(const x of [-1.8,1.8]){
  const o={x,y:2.9,z:5},target=techniqueTarget({position:o,kind:'drop'});
  const good=fly(o,target,'drop',{touch:1.35,quality:1}),bad=fly(o,target,'drop',{touch:.6,quality:.45});
  assert.ok(good.netY>COURT.netHeight+.035&&good.netY<COURT.netHeight+.10);
  assert.ok(bad.netY>good.netY+.10);assert.ok(distance(good.landing,target)<.06);
  const p={...o},v={...good.v};while(p.z>0)advance(p,v,1/240);
  assert.ok(v.y<-.8,'a good drop must be descending at the tape, not floating upwards');
 }
});

test('slice smash is a playable diagonal attack with a slower brushed contact than a full smash',()=>{
 const o={x:1.8,y:3.2,z:3.8},player={x:1.8,z:4.45};const strokes={};
 for(const kind of ['smash','slicesmash']){
  const target=techniqueTarget({position:o,kind}),s=strokeOutcome({position:o,player,kind,target});
  assert.equal(s.fault,null);const f=fly(o,s.target,kind,{speed:s.speedMps});
  assert.ok(f.netY>COURT.netHeight);assert.ok(distance(f.landing,target)<.06);strokes[kind]=f;
 }
 assert.ok(strokes.slicesmash.landing.x< -2);assert.ok(strokes.slicesmash.time>strokes.smash.time*1.2);
 assert.ok(Math.hypot(...Object.values(strokes.slicesmash.v))<Math.hypot(...Object.values(strokes.smash.v))*.85);
 const bad=strokeOutcome({position:{x:1.8,y:1.7,z:3.8},player,kind:'slicesmash',target:{x:-2,z:-3.5}});assert.equal(bad.fault,'net');
});

test('incoming impact energy distinguishes soft landings and steep smashes without a uniform low cap',()=>{
 const heights=[];
 for(const speed of [1.5,7,12,25]){
  const b=createGroundMotion({x:0,y:.03,z:0},{x:2,y:-speed,z:-5});let apex=b.pos.y;
  for(let i=0;i<720;i++){stepGroundMotion(b,1/240);apex=Math.max(apex,b.pos.y);}
  assert.ok(b.settled);assert.ok(apex<.75);assert.ok(b.bounces<=3);assert.ok(Math.hypot(b.vel.x,b.vel.y,b.vel.z)<1e-6);heights.push(apex);
 }
 assert.ok(heights[0]<.06);assert.ok(heights[2]>.4);assert.ok(heights.every((h,i)=>i===0||h>heights[i-1]));
});

test('ground contact preserves the incoming axis and grazing hits skid farther than steep hits',()=>{
 const o={x:0,y:.03,z:0};const shallow=createGroundMotion(o,{x:0,y:-2,z:-12}),steep=createGroundMotion(o,{x:0,y:-12,z:-2});
 assert.ok(shallow.tilt>steep.tilt);assert.ok(Math.abs(shallow.heading-Math.atan2(0,12))<1e-12);
 for(let i=0;i<720;i++){stepGroundMotion(shallow,1/240);stepGroundMotion(steep,1/240);}
 assert.ok(Math.abs(shallow.pos.z)>Math.abs(steep.pos.z)*2);assert.ok(shallow.pos.y>=.03&&steep.pos.y>=.03);
});

test('each opponent technique slider affects its own actual on-court capability',()=>{
 const base=OPPONENT_LEVELS.master,neutral=effectiveOpponentLevel(base);
 const low=key=>effectiveOpponentLevel(base,'allround',{[key]:.4}),high=key=>effectiveOpponentLevel(base,'allround',{[key]:1.6});
 assert.ok(high('attack').power>low('attack').power*1.7);assert.equal(high('attack').reaction,neutral.reaction);
 assert.ok(high('defense').reaction<low('defense').reaction*.4);assert.ok(high('defense').reach>low('defense').reach);
 assert.ok(high('control').accuracy>low('control').accuracy+.4);assert.ok(high('net').netSkill>low('net').netSkill+.5);
 assert.ok(high('speed').speed>low('speed').speed*2);assert.ok(high('speed').acceleration>low('speed').acceleration);
 assert.ok(high('stamina').stamina>low('stamina').stamina*3);
 const context={shot:'netcross',position:{x:0,y:.75,z:-1.5},distance:1.1,reach:1.4};
 assert.ok(opponentReceiveMissChance({...context,level:low('net')})>opponentReceiveMissChance({...context,level:high('net')})+.15);
 const movement={position:{x:0,z:-4},velocity:{x:0,z:0},target:{x:2,z:-1},energy:100};
 assert.ok(opponentFootwork({...movement,level:high('speed')},.2).velocity.x>opponentFootwork({...movement,level:low('speed')},.2).velocity.x);
 const execution={type:'clear',target:{x:1,z:5.8},random:()=>.99};
 assert.ok(opponentStrokeExecution({...execution,level:high('control')}).target.z>opponentStrokeExecution({...execution,level:low('control')}).target.z);
});

test('both slider sets reject invalid values and the player can use the full advertised range',()=>{
 assert.equal(normalizeSkills({attack:999,net:-99,control:'bad'}).attack,1.6);assert.equal(normalizeSkills({net:-99}).net,.4);
 assert.equal(normalizeSkills(null).control,1);
 const read=value=>playerStatsFromInputs({querySelector:()=>({value})});
 assert.equal(read(40).attack,.4);assert.equal(read(160).defense,1.6);
 const c={position:{x:2.5,y:1.7,z:3},velocity:{x:0,y:-1,z:0},player:{x:0,z:3},active:true,lastHitter:'opponent',assisted:true};
 assert.equal(canContact({...c,reachBonus:-.33}),false);assert.equal(canContact({...c,reachBonus:.33}),true);
});

test('sliced swings have distinct brushing poses while their sweet spot still meets the shuttle',()=>{
 for(const kind of ['slicesmash','slicedrop','netcross']){
  const contact=[.42,.08,-1.2],pose=swingPose({elapsed:.095,kind,contact});
  const head=new THREE.Vector3(0,.4896,0).applyEuler(new THREE.Euler(...pose.rotation)).add(new THREE.Vector3(...pose.position));
  assert.ok(head.distanceTo(new THREE.Vector3(...contact))<1e-6);
 }
 assert.notDeepEqual(swingPose({elapsed:.30,kind:'slicesmash'}),swingPose({elapsed:.30,kind:'smash'}));
 assert.notDeepEqual(swingPose({elapsed:.22,kind:'netcross'}),swingPose({elapsed:.22,kind:'net'}));
});

test('8 and 9 work on both number rows without changing existing mouse controls',()=>{
 for(const code of ['Digit8','Numpad8'])assert.equal(keyCommand(code).kind,'slicesmash');
 for(const code of ['Digit9','Numpad9'])assert.equal(keyCommand(code).kind,'slicedrop');
 assert.equal(pointerCommand(0).kind,'auto');assert.equal(pointerCommand(2).kind,'smash');
});
