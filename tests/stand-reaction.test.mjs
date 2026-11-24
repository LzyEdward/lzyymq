import test from 'node:test';
import assert from 'node:assert/strict';
import {crowdReaction} from '../stand-audio.mjs';

test('the crowd reacts to saves and sudden interceptions on either side',()=>{
 const routine={height:1.8,reach:.6,stretched:false,pressure:.17,stroke:'clear',rally:7,close:false};
 for(const rally of [2,7,12,17,22])assert.equal(crowdReaction({...routine,rally}),0);
 const save={...routine,rally:3,height:.69,reach:1.08,stroke:'lift'};
 assert.ok(crowdReaction(save)>0);assert.ok(crowdReaction({...save,close:true})>crowdReaction(save));
 assert.ok(crowdReaction({...routine,stroke:'netkill',rally:4})>0);
 assert.equal(crowdReaction({...routine,stroke:'netkill',rally:2}),0);
});
