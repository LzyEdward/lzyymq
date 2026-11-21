import test from 'node:test';
import assert from 'node:assert/strict';
import {crossesStrings,defensiveReach} from '../controls.mjs';
import {advance,solveShot,groundCrossing,COURT} from '../physics.mjs';
import {matchKit,hairCutOffset} from '../match-kit.mjs';

test('a fast cork crosses between ticks, while misses beyond the frame and parallel to it stay misses',()=>{
 const cross=(x,y,z)=>crossesStrings({x,y,z:-z},{x,y,z});
 assert.equal(cross(.04,.53,.24),true);
 assert.equal(cross(.16,.53,.24),false);
 assert.equal(cross(0,.70,.24),false);
 assert.equal(crossesStrings({x:0,y:.50,z:.11},{x:.04,y:.50,z:.12}),false);
 for(const side of [-1,1]){
  const feet={x:0,z:side*4};
  assert.equal(defensiveReach({x:.12*side,y:1.12,z:side*3.25},feet,0,side),true);
  assert.equal(defensiveReach({x:1.8*side,y:1.4,z:side*3.4},feet,0,side),false);
 }
});

test('a high push travels flatter and quicker than a low rescue and reaches the requested rear corner',()=>{
 const target={x:1.65,z:-5.75};
 const fly=y=>{
  const p={x:.12,y,z:1.65},v=solveShot(p,target,'push',{quality:.92}),speed=Math.hypot(v.x,v.y,v.z);
  let netY=0;
  for(let i=0;i<600;i++){
   const prev={...p};advance(p,v,1/120);
   if(prev.z*p.z<=0)netY=prev.y+(p.y-prev.y)*prev.z/(prev.z-p.z);
   const floor=groundCrossing(prev,p);
   if(floor)return {netY,speed,floor,time:(i+floor.fraction)/120};
  }
  assert.fail('push did not land');
 };
 const high=fly(1.96),low=fly(1.1);
 assert.ok(high.speed>low.speed*1.35 && high.time<low.time);
 for(const f of [low,high]){assert.ok(f.netY>COURT.netHeight+.04);assert.ok(Math.hypot(f.floor.x-target.x,f.floor.z-target.z)<.04);}
});

test('style and roster identities agree on ink, cloth and haircut',()=>{
 assert.equal(matchKit('linDan08').shirt,matchKit({id:'linDan',seed:1}).shirt);
 assert.equal(matchKit('leeChongWei').team,'MAS');
 const heads=['crop','crew','wave','part','sweep'].map(c=>hairCutOffset(c,.045,1.79,.09).join('/'));
 assert.equal(new Set(heads).size,5);
});
