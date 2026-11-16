import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createArmKinematics,ARM_WRIST} from '../first-person-arm.mjs';
import {swingPose} from '../motion.mjs';

test('arm adjustment preserves the sweet spot throughout all ordinary stroke arcs',()=>{
 const rig=createArmKinematics(T),head=new T.Vector3(0,.4896,0),transform=(p,v)=>v.clone().applyEuler(new T.Euler(...p.rotation)).add(new T.Vector3(...p.position));
 let reachable=0,total=0;
 for(const kind of ['clear','smash','drop','net','netcross','push','slicesmash','slicedrop'])for(let t=0;t<.48;t+=1/120){
  const before=swingPose({elapsed:t,kind}),after=rig.pose(before);assert.ok(transform(before,head).distanceTo(transform(after,head))<1e-6);
  assert.ok([...after.position,...after.rotation].every(Number.isFinite));if(after.reachable)reachable++;total++;
 }
 assert.ok(reachable/total>.98,`${reachable}/${total} poses physically reachable`);
});
test('elbow chain preserves both bone lengths for ordinary poses and reports unreachable assistance',()=>{
 const rig=createArmKinematics(T),group=new T.Group();
 for(const kind of ['clear','smash','drop','net','netcross','push'])for(let t=0;t<.48;t+=1/120){
  const pose=rig.pose(swingPose({elapsed:t,kind}));group.position.fromArray(pose.position);group.rotation.fromArray([...pose.rotation,'XYZ']);const chain=rig.chain(group);
  if(pose.reachable){assert.ok(Math.abs(chain.wrist.distanceTo(chain.elbow)-rig.lowerLength)<1e-5);assert.ok(Math.abs(chain.shoulder.distanceTo(chain.elbow)-rig.upperLength)<1e-5);}
 }
 group.position.set(-1,1,-2);const chain=rig.chain(group);assert.equal(chain.reachable,false);assert.ok(chain.extension>1);assert.ok(Math.abs(chain.wrist.distanceTo(chain.elbow)-rig.lowerLength)<1e-6);
});

test('bounded shoulder reach recovers high contacts without moving the racket contact point',()=>{
 const rig=createArmKinematics(T),fixed=createArmKinematics(T,{mobility:0}),head=new T.Vector3(0,.4896,0),contact=[.45,.7,-.95];
 const before=swingPose({elapsed:.095,kind:'smash',contact}),after=rig.pose(before),group=new T.Group();
 assert.equal(fixed.pose(before).reachable,false);assert.equal(after.reachable,true);
 group.position.fromArray(after.position);group.rotation.fromArray([...after.rotation,'XYZ']);const chain=rig.chain(group);
 assert.ok(chain.shoulder.distanceTo(rig.shoulder)<=.140001);
 assert.ok(Math.abs(chain.elbow.distanceTo(chain.shoulder)-rig.upperLength)<1e-5);
 assert.ok(Math.abs(chain.elbow.distanceTo(chain.wrist)-rig.lowerLength)<1e-5);
 assert.ok(head.applyMatrix4(group.matrix).distanceTo(new T.Vector3(...contact))<1e-6);
});

test('shoulder mobility remains bounded and continuous for distant assisted contacts',()=>{
 const rig=createArmKinematics(T),group=new T.Group();let previous=null;
 for(let x=0;x<2;x+=.001){
  group.position.set(x,.2,-1);const chain=rig.chain(group);
  assert.ok(chain.shoulder.distanceTo(rig.shoulder)<=.140001);
  if(previous)assert.ok(chain.shoulder.distanceTo(previous)<.002);
  previous=chain.shoulder;
 }
 assert.equal(rig.chain(group).reachable,false);
});
