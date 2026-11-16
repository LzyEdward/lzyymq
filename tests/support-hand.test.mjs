import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {supportHandPose,serveSupportPose,readySupportPose} from '../motion.mjs';
import {createArmKinematics} from '../first-person-arm.mjs';

test('support hand preserves the feather pinch before release',()=>{
 const cork=[-.1,-.44,-1.15],pose=supportHandPose({phase:'serve',cork}),hold=serveSupportPose({phase:'serve'});
 const pinch=new T.Vector3(.023,.137,.018).applyEuler(new T.Euler(...pose.rotation)).add(new T.Vector3(...pose.position));
 assert.ok(pinch.distanceTo(new T.Vector3(...cork).add(new T.Vector3(...hold.offset)))<1e-8);
});
test('serve withdrawal joins the ready hand continuously without a visibility cut',()=>{
 const cork=[-.1,-.44,-1.15],h=1e-5;
 for(const at of [.175,.2,.36,.37,.46]){
  const sample=t=>supportHandPose({phase:t<.2?'serving':'rally',elapsed:t,swing:t,kind:'serve',cork});
  const a=sample(at-h),b=sample(at),c=sample(at+h);
  for(const key of ['position','rotation']){
   const l=b[key].map((v,i)=>(v-a[key][i])/h),r=c[key].map((v,i)=>(v-b[key][i])/h);
   assert.ok(Math.hypot(...a[key].map((v,i)=>v-c[key][i]))<.001,`position discontinuity ${key} ${at}`);
   assert.ok(Math.hypot(...l.map((v,i)=>v-r[i]))<.03,`velocity discontinuity ${key} ${at}`);
  }
 }
});
test('balancing hand stays within physical reach and below the central shuttle lane',()=>{
 const rig=createArmKinematics(T,{side:-1}),group=new T.Group();group.scale.x=-1;
 for(const kind of ['clear','smash','drop','net','netcross','push'])for(let t=0;t<.6;t+=1/120){
  const pose=readySupportPose({kind,elapsed:t,speed:5.25,time:t,lateral:5});
  group.position.fromArray(pose.position);group.rotation.fromArray([...pose.rotation,'XYZ']);
  const chain=rig.chain(group);assert.ok(chain.reachable,`${kind} ${t} extension ${chain.extension}`);
  assert.ok(pose.position[0]<-.2&&pose.position[1]<-.4&&pose.position[2]<-.5);
 }
});
