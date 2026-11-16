import test from 'node:test';
import assert from 'node:assert/strict';
import {OPPONENT_LEVELS} from '../competition.mjs';
import {opponentReceiveBase,opponentContactWindow,opponentFootwork,planOpponentStroke} from '../opponent-ai.mjs';
import {advance,solveShot,predict} from '../physics.mjs';

test('short-serve receiving stance gives every grade a physical return opportunity',()=>{
 for(const level of Object.values(OPPONENT_LEVELS))for(const sign of [-1,1]){
  const ball={x:.35*sign,y:1.135,z:3.4},velocity=solveShot(ball,{x:-1.25*sign,z:-2.15},'serve'),prediction=predict(ball,velocity,-1,2.3);
  let position=opponentReceiveBase({serverX:sign}),speed={x:0,z:0},reachable=false;
  const intercept=prediction.intercept,target={x:intercept.x-.1,z:intercept.z-.58};
  for(let t=0;t<1.1&&ball.y>.035;t+=1/120){
   const step=opponentFootwork({position,velocity:speed,target,level,waiting:t<level.reaction},1/120);position=step.position;speed=step.velocity;
   advance(ball,velocity,1/120);
   if(t>=level.reaction&&opponentContactWindow({ball,position,level})&&velocity.y<1)reachable=true;
  }
  assert.ok(reachable,`${level.name} must be able to reach a central short serve before it lands`);
 }
});
test('a falling tight drop cannot be returned from behind the body or killed below tape',()=>{
 for(const level of Object.values(OPPONENT_LEVELS)){
  assert.equal(opponentContactWindow({ball:{x:0,y:.8,z:-1.7},position:{x:0,z:-1.4},level}),false);
  for(let i=0;i<80;i++){
   const plan=planOpponentStroke({level,position:{x:.2,y:1.1,z:-1.4},player:{x:0,z:5},random:()=>i/80});
   assert.ok(!['smash','slicesmash','netkill'].includes(plan.type));
  }
 }
 const ball={x:0,y:.7,z:-1.2},position={x:0,z:-2.3};
 assert.equal(opponentContactWindow({ball,position,level:OPPONENT_LEVELS.easy}),false);
 assert.equal(opponentContactWindow({ball,position,level:OPPONENT_LEVELS.legend}),true);
});
