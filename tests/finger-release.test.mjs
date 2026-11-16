import test from 'node:test';
import assert from 'node:assert/strict';
import {handPaths,supportFingerPaths} from '../hand-pose.mjs';
import {supportHandPose,serveSupportPose} from '../motion.mjs';

test('released fingers preserve every joint length, keep roots, and separate the pinch',()=>{
 const original=handPaths(true);assert.deepEqual(supportFingerPaths(0),original);
 for(let t=0;t<=1;t+=.01){const paths=supportFingerPaths(t);for(let f=0;f<5;f++){
  assert.deepEqual(paths[f][0],original[f][0]);
  for(let k=0;k<3;k++){const length=p=>Math.hypot(...p[k+1].map((n,i)=>n-p[k][i]));assert.ok(Math.abs(length(paths[f])-length(original[f]))<1e-10);}
 }}
 const released=supportFingerPaths(1),gap=p=>Math.hypot(...p[0][3].map((n,i)=>n-p[4][3][i]));assert.ok(gap(released)>.035);assert.ok(gap(original)<.015);
});
test('feather pinch opens continuously after release and stays relaxed through rallies',()=>{
 assert.equal(serveSupportPose({phase:'serve'}).relaxation,0);let before=0;
 for(let t=0;t<.2;t+=1/120){const {relaxation}=serveSupportPose({phase:'serving',elapsed:t});assert.ok(relaxation>=before&&relaxation<=1);assert.ok(relaxation-before<.09);before=relaxation;}
 assert.equal(supportHandPose({phase:'rally'}).relaxation,1);
 for(const invalid of [NaN,Infinity,-1])assert.deepEqual(supportFingerPaths(invalid),originalPinch());
 function originalPinch(){return supportFingerPaths(0);}
});
