import test from 'node:test';
import assert from 'node:assert/strict';
import {canContact,netKillOpportunity,receiveIntercept} from '../controls.mjs';
import {opponentLevel} from '../competition.mjs';
import {opponentStrokeExecution,opponentFootwork} from '../opponent-ai.mjs';
import {advance,COURT,solveShot} from '../physics.mjs';
import {overheadPreparation} from '../tracking.mjs';
import {contactPressure} from '../tactics.mjs';

test('a rising sitter can be intercepted in front of the tape-side receiver',()=>{
 const ball={x:.1,y:1.98,z:.82},feet={x:0,z:1.44};
 assert.ok(netKillOpportunity(ball,feet));
 assert.ok(canContact({position:ball,player:feet,velocity:{y:4},assisted:true,active:true,lastHitter:'opponent'}));
 for(const bad of [{...ball,y:1.50},{...ball,z:1.8},{...ball,x:2},{...ball,z:-.1}])
  assert.equal(netKillOpportunity(bad,feet),false);
 assert.equal(netKillOpportunity({...ball,z:4.2},{x:0,z:4.6}),false);
});

test('a rushed low lift creates a physically reachable interception while a settled lift clears the attacker',()=>{
 const feet={x:.7,z:1.9},target={x:.8,z:5.9};
 function flight(level,height,pressure){
  const point={x:.5,y:height,z:-1},shot=opponentStrokeExecution({level:opponentLevel(level),type:'lift',target,pressure,height,random:()=>.5});
  const velocity=solveShot(point,shot.target,'lift',{up:shot.up}),contact=receiveIntercept(point,velocity,feet,1,7,2.78,true);
  let netY=0,peak=height,window=0;
  for(let i=0;i<600&&point.y>.08;i++){
   const before=point.z;advance(point,velocity,1/120);
   if(before<0&&point.z>=0)netY=point.y;
   peak=Math.max(peak,point.y);if(netKillOpportunity(point,feet))window++;
  }
  assert.ok(netY>COURT.netHeight&&Math.abs(point.z-shot.target.z)<.14);
  return {peak,depth:point.z,window,contact};
 }
 const short=flight('hard',.70,.78),deep=flight('legend',1.45,.08);
 assert.ok(short.window>=5&&short.contact.z<2.12&&short.depth<2.6);
 assert.ok(deep.window===0&&deep.depth>5&&deep.peak>short.peak+1);
});

test('a late lunge and an early settled catch exert different pressure',()=>{
 const common={initial:.55,distance:.65,reach:1.2,energy:85};
 assert.ok(contactPressure({...common,height:.65,speed:4.6,chased:3.6})>
  contactPressure({...common,height:1.45,speed:.5,chased:3.6})+.4);
});

test('a defender moving the wrong way needs time to brake and higher grades turn sooner',()=>{
 function reversal(key){
  let position={x:0,z:-3},velocity={x:0,z:-2};
  for(let frames=1;frames<=120;frames++){
   ({position,velocity}=opponentFootwork({position,velocity,level:opponentLevel(key),target:{x:0,z:-1}},1/120));
   if(velocity.z>=0)return frames;
  }
 }
 assert.ok(reversal('easy')>reversal('legend')+12);
});

test('both views can distinguish a high return behind the shoulder from a planted overhead',()=>{
 const ball={x:0,y:5,z:3},contact={x:.1,y:2.72,z:3.1};
 assert.ok(overheadPreparation(ball,{x:0,z:2.35},contact).turn>.9);
 assert.ok(overheadPreparation(ball,{x:0,z:3.85},contact).ready>.9);
 assert.equal(overheadPreparation(ball,{x:0,z:2.35},contact).ready,0);
 assert.deepEqual(overheadPreparation(ball,{x:0,z:3.85},null),{turn:0,ready:0});
});
