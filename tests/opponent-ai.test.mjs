import test from 'node:test';
import assert from 'node:assert/strict';
import {OPPONENT_LEVELS} from '../competition.mjs';
import {opponentFootwork,planOpponentStroke,recoveryBase,opponentReceiveMissChance,opponentStrokeExecution,opponentServeTarget,defensiveIntercept,opponentWeaknessProfile,opponentWeaknessKey} from '../opponent-ai.mjs';
import {advance,COURT,predict,solveShot} from '../physics.mjs';

const level=key=>OPPONENT_LEVELS[key];

test('opponent short serves stay inside a readable central receive lane at every grade',()=>{
 for(const ai of Object.values(OPPONENT_LEVELS))for(let i=0;i<100;i++){
  let seed=(i+1)*7919+ai.tier*104729;const random=()=>((seed=(seed*48271)%2147483647)-1)/2147483646;
  const target=opponentServeTarget({level:ai,random});
  assert.ok(Math.abs(target.x)<=.62,`${ai.name} serve too wide: ${JSON.stringify(target)}`);
  assert.ok(target.z>=3.32&&target.z<=3.72,`${ai.name} serve too short: ${JSON.stringify(target)}`);
 }
 const easy=opponentServeTarget({level:level('easy'),random:()=>.99}),elite=opponentServeTarget({level:level('legend'),random:()=>.99});
 assert.ok(Math.abs(easy.x)<.62&&Math.abs(elite.x)<=.62);
});

test('readable serves clear the net and land on the receiver side for all ten grades',()=>{
 const origin={x:-.35,y:1.15,z:-3.85};
 for(const [index,ai] of Object.values(OPPONENT_LEVELS).entries()){
  const target=opponentServeTarget({level:ai,random:()=>((index*37+17)%97)/97});
  const velocity=solveShot(origin,target,'serve',{up:6}),p={...origin},v={...velocity};let netY=null,time=0;
  for(let i=0;i<900&&p.y>.06;i++){
   const oldZ=p.z;advance(p,v,1/180);time+=1/180;
   if(oldZ*p.z<=0&&oldZ!==p.z)netY=p.y;
  }
  assert.ok(netY>COURT.netHeight,`${ai.name} serve failed the net`);
  assert.ok(p.z>0&&Math.hypot(p.x-target.x,p.z-target.z)<.12,`${ai.name} serve missed its target`);
  assert.ok(time>1.05&&time<1.35,`${ai.name} serve flight was too short or implausibly slow`);
 }
});

test('opponent changes placement, shot and net technique without repeating a fixed return',()=>{
 const history=[];const observed=new Set();let state=139;
 const random=()=>((state=(state*48271)%2147483647)-1)/2147483646;
 for(let seed=1;seed<=100;seed++){
  const plan=planOpponentStroke({level:level('expert'),position:{x:.4,y:1.4,z:-1.7},player:{x:1.6,z:5.1},playerVelocity:{x:-.8,z:-.5},history,random});
  observed.add(`${plan.type}:${plan.action}`);history.push(plan);if(history.length>6)history.shift();
 }
 assert.ok(observed.size>=5,`Only selected ${observed.size} return variants`);
 assert.ok([...observed].some(action=>action.includes('勾对角')||action.includes('搓网')));
});

test('low net contact prioritizes a high defensive lift instead of attempting an impossible net brush',()=>{
 const options=Array.from({length:20},(_,i)=>planOpponentStroke({level:level('legend'),position:{x:0,y:.6,z:-1.1},player:{x:2,z:5},energy:100,history:[],random:()=>i/20}));
 assert.ok(options.every(option=>option.type==='lift'));
});

test('profile, player movement and fatigue influence tactical choice and shot accuracy',()=>{
 const setup={level:level('pro'),position:{x:.3,y:2.7,z:-3.8},player:{x:.1,z:5.4},playerVelocity:{x:0,z:0},random:()=>.7};
 const attacks={attack:0,defend:0};
 for(const profile of ['attack','defend'])for(let i=0;i<100;i++){
  const plan=planOpponentStroke({...setup,profile,random:()=>(i+.5)/100});
  if(['smash','slicesmash','drive','netkill'].includes(plan.type))attacks[profile]++;
 }
 assert.ok(attacks.attack>attacks.defend+10,JSON.stringify(attacks));
 assert.ok(level('legend').accuracy>level('easy').accuracy);
 assert.notDeepEqual(recoveryBase({lastContact:{x:0,z:-1},lastTarget:{x:2,z:1},level:level('legend')}),recoveryBase({lastContact:{x:0,z:-1},lastTarget:{x:-2,z:5.8},level:level('legend')}));
});

test('low grades miss short balls and stretched reaches much more often than elite grades',()=>{
 const context={shot:'drop',position:{x:0,y:.6,z:-1.5},distance:1.04,reach:1.05,energy:82};
 const chances=Object.values(OPPONENT_LEVELS).map(ai=>opponentReceiveMissChance({...context,level:ai}));
 assert.ok(chances[0]>.2,`beginner net-miss chance ${chances[0]}`);
 assert.ok(chances[9]<.12,`elite net-miss chance ${chances[9]}`);
 assert.ok(chances.every((n,i)=>i===0||n<chances[i-1]));
 const early={...context,distance:.65};
 assert.ok(opponentReceiveMissChance({...context,level:level('easy')})>opponentReceiveMissChance({...early,level:level('easy')}));
});

test('beginner net-shot misses are common enough to reward a good drop, while elite misses stay rare',()=>{
 const setup={shot:'drop',position:{x:.1,y:.78,z:-1.65},distance:.96,reach:1.05,energy:90};
 const beginner=opponentReceiveMissChance({...setup,level:level('easy')}),club=opponentReceiveMissChance({...setup,level:level('hard')}),elite=opponentReceiveMissChance({...setup,level:level('legend')});
 assert.ok(beginner>.35,`beginner net miss chance ${beginner}`);
 assert.ok(club>.2&&club<beginner,`club net miss chance ${club}`);
 assert.ok(elite<.12,`elite net miss chance ${elite}`);
});

test('beginner clears land short and low grades occasionally fault under pressure',()=>{
 const target={x:.3,z:5.8};
 const easy=opponentStrokeExecution({level:level('easy'),type:'clear',target,random:()=>.99});
 const elite=opponentStrokeExecution({level:level('legend'),type:'clear',target,random:()=>.99});
 assert.ok(easy.target.z<elite.target.z-1);
 assert.equal(easy.fault,null);assert.equal(elite.fault,null);
 assert.ok(opponentStrokeExecution({level:level('easy'),type:'drop',target,random:()=>0}).fault);
 assert.equal(opponentStrokeExecution({level:level('legend'),type:'drop',target,random:()=>.01}).fault,null);
});

test('footwork selects a split step, crossover, net approach and recovery with bounded positions',()=>{
 const ai=level('hard'),p={x:0,z:-4.5},v={x:0,z:0};
 assert.equal(opponentFootwork({position:p,velocity:v,target:{x:0,z:-4.5},level:ai,waiting:true},1/60).mode,'split');
 assert.equal(opponentFootwork({position:p,velocity:v,target:{x:-2,z:-6},level:ai},1/60).mode,'crossover');
 assert.equal(opponentFootwork({position:p,velocity:v,target:{x:0,z:-1},level:ai},1/60).mode,'net-approach');
 const result=opponentFootwork({position:{x:3.2,z:-.65},velocity:{x:20,z:20},target:{x:-3,z:-7},level:ai},.5);
 assert.ok(result.position.x>=-3.2&&result.position.x<=3.2);
 assert.ok(result.position.z>=-7.1&&result.position.z<=-.65);
 assert.ok(Number.isFinite(result.velocity.x+result.velocity.z));
});

test('opponent performs a readable anticipation split before full-speed pursuit',()=>{
 const ai=level('expert'),p={x:0,z:-4.5},target={x:2,z:-1.4},v={x:0,z:0};
 const split=opponentFootwork({position:p,velocity:v,target,level:ai,waiting:true},1/60);
 const chase=opponentFootwork({position:p,velocity:v,target,level:ai,waiting:false},1/60);
 assert.ok(Math.hypot(split.velocity.x,split.velocity.z)>0,'split step should show movement');
 assert.ok(Math.hypot(chase.velocity.x,chase.velocity.z)>Math.hypot(split.velocity.x,split.velocity.z)*2,'reaction should release a clear acceleration');
 assert.ok(split.mode==='split'&&chase.mode==='net-approach');
});

test('competent opponents visibly use both brush and cross-court net replies',()=>{
 const actions=new Set();
 for(let i=0;i<500;i++){
  const plan=planOpponentStroke({level:level('expert'),position:{x:.1,y:1.75,z:-1.3},player:{x:1.4,z:5.2},playerVelocity:{x:0,z:0},random:()=>((i*73)%499)/499});
  actions.add(plan.action);
 }
 assert.ok(actions.has('搓网'),'brush shot should appear on net contacts');
 assert.ok(actions.has('勾对角'),'cross-court hook should appear on net contacts');
});

test('low net contacts keep straight and diagonal brushes playable across the tape',()=>{
 for(const levelKey of ['hard','expert','legend']){
  for(const position of [{x:-1.1,y:1.3,z:-1.45},{x:1.1,y:1.3,z:-1.45}]){
   for(const action of [0,.24,.48,.72,.96]){
    const plan=planOpponentStroke({level:level(levelKey),position,player:{x:0,z:4.6},random:()=>action});
    if(!['net','netcross'].includes(plan.type))continue;
    const velocity=solveShot(position,plan.target,plan.type);
    const landing=predict(position,velocity,1).landing;
    assert.ok(landing?.z>0,JSON.stringify({levelKey,position,plan,landing}));
   }
  }
 }
});

test('each of the ten opponent grades can return real, finite shots across the net',()=>{
 const situations=[
  {position:{x:-.6,y:.62,z:-1.2},player:{x:1.8,z:4.9}},
  {position:{x:.4,y:1.5,z:-1.8},player:{x:1.1,z:4.6}},
  {position:{x:-.5,y:2.7,z:-4.6},player:{x:-.4,z:4.9}},
  {position:{x:1.5,y:3,z:-5.1},player:{x:-2,z:5.8}},
 ];
 let tested=0;
 for(const [index,[key,ai]] of Object.entries(OPPONENT_LEVELS).entries())for(let i=0;i<situations.length;i++){
  const {position,player}=situations[i];
  const plan=planOpponentStroke({level:ai,position,player,playerVelocity:{x:.7,z:-.5},random:()=>((i*3+index)%17)/17});
  assert.ok(plan.target.z>0,`${key} aimed outside the receiver's half: ${JSON.stringify(plan)}`);
  const velocity=solveShot(position,plan.target,plan.type,{speed:plan.type==='smash'?ai.power:plan.type==='netkill'?ai.power*.65:undefined});
  assert.ok(Object.values(velocity).every(Number.isFinite),`${key} ${plan.type} produced a non-finite trajectory`);
  const p={...position},v={...velocity};let crossed=false;
  for(let step=0;step<1200&&p.y>.06;step++){const z=p.z;advance(p,v,1/180);if(z*p.z<0)crossed=true;}
  assert.ok(crossed&&p.z>0&&Math.abs(p.x)<=COURT.halfWidth+.1,`${key} ${plan.type} did not reach the opponent court: ${JSON.stringify({plan,landing:p})}`);
  tested++;
 }
 assert.equal(tested,40);
});

test('opponent varies the landing lane after a repeated setup',()=>{
 const setup={level:level('elite'),position:{x:.4,y:1.45,z:-1.7},player:{x:1.4,z:5.1},playerVelocity:{x:-.4,z:.2}};
 let repeated=0;const samples=240;
 for(let i=0;i<samples;i++){
  const random=()=>i/samples,first=planOpponentStroke({...setup,random});
  const next=planOpponentStroke({...setup,history:[first,first],random});
  if(Math.hypot(first.target.x-next.target.x,first.target.z-next.target.z)<1.15)repeated++;
 }
 assert.ok(repeated<samples*.3,`Repeated the same landing lane ${repeated}/${samples} times`);
});

test('weakness profiles become visibly smaller at higher grades and differ by style',()=>{
 const beginner=opponentWeaknessProfile({level:level('easy'),style:'allround'});
 const elite=opponentWeaknessProfile({level:level('legend'),style:'allround'});
 const taufik=opponentWeaknessProfile({level:level('expert'),style:'taufik'});
 assert.ok(beginner.net>elite.net&&beginner.backhand>elite.backhand);
 assert.ok(taufik.net<opponentWeaknessProfile({level:level('expert'),style:'allround'}).net);
 assert.equal(opponentWeaknessKey({position:{x:0,y:1,z:-1.4},shot:'drop'}),'net');
 assert.equal(opponentWeaknessKey({position:{x:-1,y:2.2,z:-4},shot:'clear'}),'backhand');
});

test('repeatedly attacking a weakness raises miss chance, then adaptation closes it',()=>{
 const levelData=level('hard'),weaknesses=opponentWeaknessProfile({level:levelData,style:'allround'});
 const context={level:levelData,shot:'drop',position:{x:.1,y:.72,z:-1.5},distance:1.02,reach:1.05,energy:92,weaknesses,weaknessKey:'net'};
 const open=opponentReceiveMissChance({...context,adaptation:0});
 const adapted=opponentReceiveMissChance({...context,adaptation:.72});
 assert.ok(open>adapted,`${open} should exceed adapted ${adapted}`);
 assert.ok(open>.25&&adapted>.12);
});
test('a steep heavy smash raises defensive error chance, while ordinary pressure stays bounded',()=>{
 const setup={level:level('easy'),shot:'smash',position:{x:0,y:2.6,z:-4},distance:1,reach:1,energy:95,incomingSpeed:75};
 const ordinary=opponentReceiveMissChance(setup),heavy=opponentReceiveMissChance({...setup,attackPressure:1});
 assert.ok(heavy>ordinary+.07);assert.ok(heavy<=.72);
});

test('better anticipation takes a reachable clear higher and earlier',()=>{
 const origin={x:0,y:2.6,z:5},velocity=solveShot(origin,{x:1.3,z:-5.7},'clear'),feet={x:.2,z:-4.3};
 const picks=['easy','master','legend'].map(key=>defensiveIntercept(origin,velocity,feet,level(key)));
 assert.ok(picks.every(Boolean));
 assert.ok(picks[2].y>picks[1].y&&picks[1].y>picks[0].y+.25);
 assert.ok(picks[2].time<picks[1].time&&picks[1].time<picks[0].time);
});
test('faster reactions reduce the added risk from a smash',()=>{
 const context={shot:'smash',position:{x:0,y:1.4,z:-4},distance:.6,reach:1.3,incomingSpeed:65};
 const penalty=reaction=>{
  const input={...context,level:{...level('master'),reaction}};
  return opponentReceiveMissChance({...input,attackPressure:1})-opponentReceiveMissChance(input);
 };
 assert.ok(penalty(.065)<penalty(.56)*.45);
});
