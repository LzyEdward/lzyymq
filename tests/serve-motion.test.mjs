import test from 'node:test';
import assert from 'node:assert/strict';
import {serveSupportPose} from '../motion.mjs';
test('the supporting hand holds feathers, releases smoothly and withdraws before disappearing',()=>{
 const hold=serveSupportPose({phase:'serve'});assert.equal(hold.release,0);
 let previous=hold;
 for(let elapsed=0;elapsed<=.2;elapsed+=1/120){const pose=serveSupportPose({phase:'serving',elapsed});assert.ok(pose);assert.ok(pose.offset.every(Number.isFinite));assert.ok(pose.release>=previous.release);assert.ok(Math.hypot(...pose.offset.map((n,i)=>n-previous.offset[i]))<.04);previous=pose;}
 const follow=serveSupportPose({phase:'rally',swing:.21});assert.equal(follow.release,1);assert.ok(follow.offset[0]<hold.offset[0]-.1);assert.ok(follow.offset[1]<hold.offset[1]-.1);
 assert.equal(serveSupportPose({phase:'rally',swing:.4}),null);assert.equal(serveSupportPose({phase:'rally',swing:0}),null);assert.equal(serveSupportPose({phase:'opponentServe'}),null);
});
