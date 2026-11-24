import test from 'node:test';
import assert from 'node:assert/strict';
import {matchIntent,resolveCharacter,characterRecovery,strokeSoundProfile} from '../match-mind.mjs';
import {planOpponentStroke,opponentReceiveMissChance,recoveryBase} from '../opponent-ai.mjs';
import {OPPONENT_LEVELS} from '../competition.mjs';
import {MatchTactics,rallyConstruction,pointAdvice} from '../tactics.mjs';
const level=OPPONENT_LEVELS.master;
function distribution(profile,{position={x:.5,y:2.8,z:-3.8},player={x:-1,z:4.7},pressure=0,match={}}={}){
 const counts={};
 for(let i=0;i<1600;i++){
  // The selector consumes randomness for placement too. A stable noncentral
  // opponent position above avoids different random consumption by profile.
  const plan=planOpponentStroke({level,profile,position,player,pressure,match,random:()=>(i+.5)/1600});
  counts[plan.type]=(counts[plan.type]||0)+1;
 }
 return counts;
}
test('star default resolves visibly while a manual personality overrides it',()=>{
 assert.equal(resolveCharacter('auto','taufik'),'netpress');
 assert.equal(resolveCharacter('auto','chenLong'),'defend');
 assert.equal(resolveCharacter('auto','leeChongWei'),'counter');
 assert.equal(resolveCharacter('defend','linDan08'),'defend');
 assert.equal(resolveCharacter('unknown','allround'),'balanced');
});
test('named opponents within one profile can prefer different strokes on the same feed',()=>{
 const forecourt={position:{x:.8,y:1.68,z:-1.6},player:{x:-1,z:4.3}};
 const momota=distribution('defend',{...forecourt,match:{opponentId:'momota'}});
 const chen=distribution('defend',{...forecourt,match:{opponentId:'chenLong'}});
 assert.ok(momota.push>chen.push*1.45);
 assert.ok(chen.lift>momota.lift*1.4);
 const base={x:.2,z:-3.6};
 assert.ok(characterRecovery(base,matchIntent({opponentId:'ginting',profile:'netpress'}),'drive').z>
 characterRecovery(base,matchIntent({opponentId:'taufik',profile:'netpress'}),'drive').z+.15);
 const low=distribution('attack',{position:{x:.8,y:.65,z:-1.4},pressure:.9,match:{opponentId:'shiYuqi'}});
 assert.deepEqual(Object.keys(low),['lift']);
});
test('score and energy change decisions without mutating level or physical ability',()=>{
 const before=JSON.stringify(level);
 assert.equal(matchIntent({score:[7,2]}).phase,'chase');
 assert.equal(matchIntent({score:[2,7]}).phase,'protect');
 assert.equal(matchIntent({score:[10,10]}).phase,'clutch');
 assert.equal(matchIntent({score:[0,0],energy:20}).phase,'manage');
 assert.equal(matchIntent({recent:[{playerWon:true},{playerWon:true},{playerWon:true}]}).phase,'chase');
 assert.equal(JSON.stringify(level),before);
});
test('aggressive and patient opponents produce materially distinct shot distributions',()=>{
 const attack=distribution('attack'),patient=distribution('defend');
 assert.ok(attack.smash+attack.slicesmash>(patient.smash+patient.slicesmash)*1.8);
 assert.ok(patient.clear>attack.clear*1.5);
});
test('net pressure favors actual forecourt techniques and recovers closer to the net',()=>{
 const context={position:{x:.5,y:1.7,z:-1.5},player:{x:-1,z:4.7}};
 const net=distribution('netpress',context),patient=distribution('defend',context);
 assert.ok(net.net+net.netcross>patient.net+patient.netcross);
 const base=recoveryBase({lastTarget:{x:1,z:5},lastContact:{x:1,z:-1.5},level});
 assert.ok(characterRecovery(base,matchIntent({profile:'netpress'})).z>characterRecovery(base,matchIntent({profile:'defend'})).z+.4);
});
test('counterattack waits for a real opening and pressure overrides aggression',()=>{
 const opening=distribution('counter',{player:{x:-2.3,z:4.7}}),closed=distribution('counter',{position:{x:.5,y:2.8,z:-5.8},player:{x:-2.3,z:4.7}});
 assert.ok(opening.smash+opening.slicesmash>(closed.smash+closed.slicesmash)*1.5);
 const safe=distribution('attack',{pressure:.85}),free=distribution('attack');
 assert.ok(safe.smash+safe.slicesmash<(free.smash+free.slicesmash)*.4);
});
test('beginner routine-contact errors decrease while stretched low net balls remain difficult',()=>{
 const setup={level:OPPONENT_LEVELS.easy,shot:'clear',position:{x:0,y:2,z:-4},distance:.35,reach:1.05};
 const routine=opponentReceiveMissChance(setup);
 const stretch=opponentReceiveMissChance({...setup,shot:'drop',position:{x:0,y:.65,z:-1.5},distance:1.02});
 assert.ok(routine<.09&&stretch>.3&&stretch>routine*4);
});
const sequence=()=>[
 {hitter:'player',type:'clear',target:{x:-2,z:-5.8},quality:.9,pressure:{strength:.7}},
 {hitter:'opponent',type:'clear',target:{x:1,z:3.9},pressureStrength:.6},
 {hitter:'player',type:'smash',target:{x:2,z:-3},position:{x:1,y:2.8,z:3.8},quality:.9,pressure:{strength:.3}},
];
test('building a short reply then attacking counts as a construction, not a free smash bonus',()=>{
 const rally=sequence();assert.equal(rallyConstruction(rally),'shortAttack');
 const match=new MatchTactics();rally.forEach(x=>match.stroke(x));
 const result=match.finish({playerWon:true,lastHitter:'player'});
 assert.equal(result.construction,'shortAttack');assert.equal(match.counts.combination,1);assert.equal(match.counts.nonSmash,0);
 for(const change of [{pressureStrength:.1},{target:{x:1,z:5.8}},{fault:'out'}]){
  const r=sequence();Object.assign(r[1],change);assert.equal(rallyConstruction(r),null);
 }
 const fault=sequence();fault[2].fault='net';assert.equal(rallyConstruction(fault),null);
});
test('consecutive backhand pressure only earns a change-line construction with real final pressure',()=>{
 const r=[{hitter:'player',type:'clear',target:{x:-2,z:-6}},{hitter:'opponent',type:'clear',target:{x:1,z:5}},
 {hitter:'player',type:'push',target:{x:-2,z:-5}},{hitter:'opponent',type:'lift',target:{x:1,z:5}},
 {hitter:'player',type:'drop',target:{x:2,z:-1},pressure:{strength:.6}}];
 assert.equal(rallyConstruction(r),'backhandChange');r.at(-1).pressure.strength=.1;assert.equal(rallyConstruction(r),null);
});
test('loss explanations distinguish low-point attacks, exposed rear court and late net coverage',()=>{
 assert.match(pointAdvice({playerWon:false,lastHitter:'player',last:{fault:'net',contactReason:'击球点太低'}}).tip,/低点/);
 assert.equal(pointAdvice({playerWon:false,lastHitter:'opponent',reply:{target:{x:1,z:5.8}},playerPosition:{x:0,z:1.5}}).cause,'上网后身后被推空');
 assert.equal(pointAdvice({playerWon:false,lastHitter:'opponent',reply:{target:{x:1,z:1}},playerPosition:{x:0,z:5}}).cause,'网前启动偏晚');
});
test('many practice points keep bounded review history without losing accumulated statistics',()=>{
 const m=new MatchTactics();for(let i=0;i<1000;i++){m.newRally();m.stroke({hitter:'player',type:'drop',quality:.9});m.finish({playerWon:true,lastHitter:'player'});}
 assert.equal(m.points.length,120);assert.equal(m.methods.drop,1000);assert.equal(m.counts.nonSmash,1000);
});
test('net touch and sliced drop sounds are shorter and softer than a full attack',()=>{
 const net=strokeSoundProfile('net'),drop=strokeSoundProfile('slicedrop'),attack=strokeSoundProfile('smash');
 assert.ok(net.tail<drop.tail&&drop.tail<attack.tail);assert.ok(net.volume<drop.volume&&drop.volume<attack.volume);
});
