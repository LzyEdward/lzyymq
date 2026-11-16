import test from 'node:test';
import assert from 'node:assert/strict';
import {strokeOutcome} from '../gameplay.mjs';
import {solveShot,advance,COURT} from '../physics.mjs';
function fly(p,v){p={...p};v={...v};let netY=Infinity,time=0;for(let i=0;i<1500&&p.y>.06;i++){const prev={...p};advance(p,v,1/120);time+=1/120;if(prev.z*p.z<0)netY=prev.y+(p.y-prev.y)*prev.z/(prev.z-p.z);}return {p,netY,time};}
const player={x:0,z:4},target={x:1.7,z:-4.7};
function stroke(position,extra={}){const s=strokeOutcome({position,player,kind:'smash',target,...extra}),v=solveShot(position,s.target,'smash',{speed:s.speedMps});if(s.fault==='net')v.y-=5.8;return {...s,v,flight:fly(position,v)};}
test('a balanced high contact produces a much faster, legal heavy smash',()=>{
 const strong=stroke({x:.2,y:3,z:3.2}),weak=stroke({x:.2,y:2.3,z:3.2});assert.equal(strong.heavy,true);assert.equal(weak.heavy,false);
 assert.ok(strong.flight.netY>COURT.netHeight);assert.ok(strong.flight.time<weak.flight.time*.65);
 assert.ok(Math.hypot(strong.flight.p.x-target.x,strong.flight.p.z-target.z)<.15);
 assert.ok(Math.hypot(strong.v.x,strong.v.y,strong.v.z)>Math.hypot(weak.v.x,weak.v.y,weak.v.z)*1.6);
});
test('08 Lin Dan attack bonus strengthens only a clean smash pressure value',()=>{
 const ordinary=strokeOutcome({position:{x:.2,y:3,z:3.2},player,target,kind:'smash'});
 const linDan=strokeOutcome({position:{x:.2,y:3,z:3.2},player,target,kind:'smash',attackBonus:.32});
 const poor=strokeOutcome({position:{x:.2,y:1.8,z:4.5},player,target,kind:'smash',attackBonus:.32});
 assert.ok(linDan.attackPressure>ordinary.attackPressure);assert.ok(linDan.attackPressure>.7);assert.ok(poor.attackPressure<linDan.attackPressure);assert.ok(poor.fault);
});
test('low contact and a shuttle behind the player can actually hit the net',()=>{
 for(const p of [{x:.2,y:1.7,z:3.2},{x:.2,y:2.7,z:4.6}]){const s=stroke(p);assert.equal(s.fault,'net');assert.ok(s.flight.netY<COURT.netHeight);}
});
test('overstretching can hit out and neither assistance nor low stamina grants heavy smashes',()=>{
 const wide=stroke({x:2,y:2.6,z:3.4});assert.equal(wide.fault,'out');assert.ok(Math.abs(wide.flight.p.x)>COURT.halfWidth);
 assert.equal(stroke({x:.2,y:3,z:3.2},{stamina:10}).heavy,false);
 assert.equal(stroke({x:.2,y:3,z:3.2},{speed:7.1}).heavy,false);
});
