import test from 'node:test';
import assert from 'node:assert/strict';
import {OpponentMemory,MatchTactics,directionalTarget,movementEnergyRate,contactPressure} from '../tactics.mjs';
import {OPPONENT_LEVELS} from '../competition.mjs';
import {planOpponentStroke,opponentStrokeExecution} from '../opponent-ai.mjs';

const observe=(memory,overrides={})=>memory.observe({type:'clear',target:{x:-2,z:-5.8},position:{x:0,z:-3.9},velocity:{x:0,z:0},quality:.95,energy:90,level:OPPONENT_LEVELS.expert,...overrides});

test('deep clear followed by a real drop creates pressure only with the opponent still at the back',()=>{
 const mind=new OpponentMemory();observe(mind);
 const late=observe(mind,{type:'drop',target:{x:1.95,z:-1.1},position:{x:-1.6,z:-5.4},velocity:{x:-2,z:-1}});
 assert.equal(late.key,'pullDrop');assert.ok(late.strength>.6);assert.ok(late.delay>.04&&late.speedFactor<1&&late.qualityPenalty>.06);
 const ready=observe(new OpponentMemory(),{type:'drop',target:{x:1.95,z:-1.1},position:{x:1.8,z:-1.8}});
 assert.equal(ready.key,null);assert.ok(ready.strength<.1);
});

test('front-to-back and cross-court changes require real displacement, not just a selected shot name',()=>{
 const mind=new OpponentMemory();observe(mind,{type:'net',target:{x:-2,z:-.9}});
 const push=observe(mind,{type:'push',target:{x:2.05,z:-5.5},position:{x:-1.6,z:-1.8},velocity:{x:-1,z:2}});
 assert.equal(push.key,'netPush');assert.ok(push.strength>.65);
 const change=observe(mind,{type:'clear',target:{x:-2,z:-5.5},position:{x:1.8,z:-4.4},velocity:{x:2,z:0}});
 assert.equal(change.key,'change');assert.ok(change.opposing>.8);
 const bad=observe(mind,{type:'netcross',target:{x:2,z:-1},position:{x:-2,z:-5},fault:'net'});
 assert.equal(bad.strength,0);assert.equal(bad.delay,0);
});

test('the opponent shifts coverage after observed repetition and stays bounded across long matches',()=>{
 const mind=new OpponentMemory(),base={x:.1,z:-4};
 const initial=mind.base(base,OPPONENT_LEVELS.pro);
 for(let i=0;i<100;i++)observe(mind,{target:{x:-2.2,z:-5.9}});
 const biased=mind.base(base,OPPONENT_LEVELS.pro);
 assert.ok(biased.x<initial.x-.4);assert.ok(biased.z<initial.z-.3);
 assert.equal(mind.shots.length,8);assert.ok(biased.x>=-1.05&&biased.z>=-4.85);
 observe(mind,{target:{x:2.1,z:-1.1},type:'drop'});
 assert.ok(Math.abs(mind.base(base,OPPONENT_LEVELS.pro).x-base.x)<Math.abs(biased.x-base.x));
 mind.reset();assert.deepEqual(mind.base(base,OPPONENT_LEVELS.pro),base);
});

test('elite anticipation reduces tactical delay while low grades retain pronounced weaknesses',()=>{
 const setup={type:'drop',target:{x:2,z:-1},position:{x:-2,z:-6},velocity:{x:-2,z:-1}};
 const easy=observe(new OpponentMemory(),{...setup,level:OPPONENT_LEVELS.easy});
 const elite=observe(new OpponentMemory(),{...setup,level:OPPONENT_LEVELS.legend});
 assert.ok(easy.delay>elite.delay*2);assert.ok(easy.qualityPenalty>elite.qualityPenalty*2);
});

test('under pressure the AI chooses more defensive replies and produces shorter clears',()=>{
 const setup={level:OPPONENT_LEVELS.master,position:{x:.6,y:2.7,z:-5},player:{x:.5,z:4.8}};
 let normalAttack=0,pressuredAttack=0;
 for(let i=0;i<400;i++){
  const random=()=>(i+.5)/400;
  if(['smash','slicesmash'].includes(planOpponentStroke({...setup,random}).type))normalAttack++;
  if(['smash','slicesmash'].includes(planOpponentStroke({...setup,pressure:.8,random}).type))pressuredAttack++;
 }
 assert.ok(normalAttack>pressuredAttack*3);
 const clear={level:OPPONENT_LEVELS.hard,type:'clear',target:{x:.3,z:5.8},random:()=>.99};
 assert.ok(opponentStrokeExecution({...clear,pressure:.8}).target.z<opponentStrokeExecution(clear).target.z-.5);
});

test('recovering early removes initial tactical pressure while a low stretched running contact remains difficult',()=>{
 const ready=contactPressure({initial:.85,distance:.35,reach:1.5,height:2.5,speed:1,energy:90});
 const late=contactPressure({initial:.85,distance:1.4,reach:1.5,height:.65,speed:6.5,energy:32});
 assert.ok(ready<.1&&late>.7);
 const match=new MatchTactics();match.stroke({hitter:'player',type:'drop',fault:null,pressure:{strength:.85}});
 match.stroke({hitter:'opponent',type:'clear',fault:'out',pressureStrength:ready});
 assert.equal(match.finish({playerWon:true,lastHitter:'opponent'}).method,'opponentError');
});

test('straight and diagonal choices preserve depth and use contact side rather than camera direction',()=>{
 for(const side of [-1,1]){
  const setup={position:{x:side*1.3,z:4},kind:'drop',natural:{x:0,z:-1.05},opponent:{x:2,z:-3}};
  const straight=directionalTarget({...setup,mode:'straight'}),cross=directionalTarget({...setup,mode:'cross'});
  assert.equal(Math.sign(straight.x),side);assert.equal(Math.sign(cross.x),-side);
  assert.equal(straight.z,-1.05);assert.equal(cross.z,-1.05);
  assert.equal(directionalTarget({...setup,mode:'open'}).x,-2.08);
 }
});

test('the same travel costs the same energy in assisted or manual play, with recovery at rest',()=>{
 const run=movementEnergyRate({speed:6.6}),rest=movementEnergyRate({speed:0});
 assert.ok(run<0&&rest>0);
 assert.ok(movementEnergyRate({speed:6.6,sprinting:true})<run-5);
 assert.ok(movementEnergyRate({speed:6.6,staminaSkill:1.6})>movementEnergyRate({speed:6.6,staminaSkill:.4}));
 const integrate=hz=>{let e=100;for(let i=0;i<hz*12;i++)e+=run/hz;return e;};
 assert.ok(Math.abs(integrate(30)-integrate(120))<1e-8);
 assert.ok(movementEnergyRate({resting:true})>rest);
});

test('points and challenges count real non-smash winners and varied tactics, not key presses or free errors',()=>{
 const match=new MatchTactics();
 for(const type of ['drop','netcross','push','clear']){
  match.newRally();match.stroke({hitter:'player',type,quality:.9,pressure:{key:'change',strength:.7},fault:null});
  const result=match.finish({playerWon:true,lastHitter:'player'});
  assert.equal(result.method,type);
 }
 assert.equal(match.counts.nonSmash,4);assert.equal(match.counts.variety,4);assert.equal(match.counts.combination,4);
 assert.equal(match.lastResult.completed.length,3);assert.ok(match.lastResult.unlocked.includes('variety'));
 match.newRally();match.stroke({hitter:'player',type:'drop',fault:'net'});
 match.finish({playerWon:false,lastHitter:'player'});assert.equal(match.counts.nonSmash,4);
 match.newRally();match.stroke({hitter:'player',type:'clear',pressure:{strength:0},fault:null});
 const free=match.finish({playerWon:true,lastHitter:'opponent',reason:'界外球'});
 assert.equal(free.method,'opponentError');assert.equal(match.counts.nonSmash,4);
 assert.equal(free.unlocked.length,0);
});

test('a forced opponent error credits its preceding placement and a new rally cannot inherit the old tactic',()=>{
 const match=new MatchTactics();
 match.stroke({hitter:'player',type:'netcross',fault:null,pressure:{key:'change',strength:.75}});
 match.stroke({hitter:'opponent',type:'lift',fault:'net'});
 const result=match.finish({playerWon:true,lastHitter:'opponent',reason:'触网'});
 assert.equal(result.forced,true);assert.equal(result.method,'netcross');assert.equal(result.detail,'左右调动');
 match.newRally();assert.equal(match.rally.length,0);
 const serve=match.finish({playerWon:true,lastHitter:'player'});assert.equal(serve.method,'opponentError');
 assert.equal(match.methods.netcross,1);
});
