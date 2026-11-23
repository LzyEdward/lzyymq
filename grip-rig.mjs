import {handPaths} from './hand-pose.mjs';
import {ARM_WRIST} from './first-person-arm.mjs';
import {refineSkin} from './skin-surface.mjs';

// Map the same anatomical hand to racket-local metres for both cameras.
export function gripRig(T,bind,open=false){
 const v=(...p)=>new T.Vector3(...p),get=name=>bind.get(name);
 const wrist=get('wrist.R'),middle=get('finger3-1.R');
 const across=get('finger2-1.R').clone().sub(get('finger5-1.R')).normalize();
 function frame(a,b,width){
  const long=b.clone().sub(a).normalize(),cross=width.clone().addScaledVector(long,-width.dot(long));
  if(cross.lengthSq()<1e-8)cross.set(0,0,1).addScaledVector(long,-long.z);
  cross.normalize();
  return new T.Matrix4().makeBasis(long,cross,long.clone().cross(cross));
 }
 function segment(a,b,c,d,width=.9,depth=.9,targetAcross=v(0,1,0)){
  const m=frame(c,d,targetAcross).multiply(new T.Matrix4().makeScale(c.distanceTo(d)/a.distanceTo(b),width,depth)).multiply(frame(a,b,across).invert());
  m.setPosition(c.clone().sub(a.clone().applyMatrix4(m)));
  return m;
 }
 const paths=handPaths(open),targetWrist=v(...ARM_WRIST),targetMiddle=v(...paths[1][0]);
 const matrices=new Map([['wrist.R',segment(wrist,middle,targetWrist,targetMiddle)]]);
 function poseFingers(paths){
  for(let f=1;f<=5;f++)for(let k=1;k<=3;k++){
   const name='finger'+f+'-'+k+'.R',a=get(name),b=k<3?get('finger'+f+'-'+(k+1)+'.R'):a.clone().addScaledVector(a.clone().sub(get('finger'+f+'-2.R')),.73);
   const path=paths[f===1?4:f-2];
   matrices.set(name,segment(a,b,v(...path[k-1]),v(...path[k]),.96,.96));
  }
 }
 poseFingers(paths);
 const toBind=new T.Quaternion().setFromRotationMatrix(frame(wrist,middle,across).multiply(frame(targetWrist,targetMiddle,v(0,1,0)).invert()));
 const offset=targetWrist.clone().applyQuaternion(toBind).negate();
 return {matrices,segment,poseFingers,toBind,offset,across};
}

// Refit the original skin in its bind pose. Fingers and handle can then move
// rigidly together, while vertices at the wrist retain their forearm weights.
export function fitCourtGrip(T,geometry,boneNames,bind,rig){
 const {position,normal,skinWeight,skinIndex}=geometry.attributes;
 const wrist=bind.get('wrist.R'),wristId=boneNames.indexOf('wrist.R');
 const origin=wrist.clone().add(rig.offset),rest=new T.Vector3(),p=new T.Vector3(),part=new T.Vector3();
 const touched=[];
 for(let i=0;i<position.count;i++){
  rest.fromBufferAttribute(position,i);p.set(0,0,0);let weight=0;
  for(let j=0;j<4;j++){
   const w=skinWeight.getComponent(i,j),bone=skinIndex.getComponent(i,j),m=rig.matrices.get(boneNames[bone]);
   if(!w||!m)continue;
   p.addScaledVector(part.copy(rest).applyMatrix4(m),w);
   skinIndex.setComponent(i,j,wristId);weight+=w;
  }
  if(!weight)continue;
  p.divideScalar(weight);
  const radius=Math.hypot(p.x,p.z);
  if(p.y>.015&&p.y<.15&&radius>0&&radius<.0148){p.x*=.0148/radius;p.z*=.0148/radius;}
  p.applyQuaternion(rig.toBind).add(origin).lerp(rest,Math.max(0,1-weight));
  position.setXYZ(i,p.x,p.y,p.z);touched.push(i);
 }
 // Weld the lighting across UV islands after curling the knuckles.
 const smoothed=geometry.clone();smoothed.computeVertexNormals();
 const sums=new Map(),key=i=>[position.getX(i),position.getY(i),position.getZ(i)].map(v=>v.toFixed(5)).join(',');
 for(const i of touched){
  const k=key(i);if(!sums.has(k))sums.set(k,new T.Vector3());
  sums.get(k).add(part.fromBufferAttribute(smoothed.attributes.normal,i));
 }
 for(const n of sums.values())n.normalize();
 for(const i of touched){const n=sums.get(key(i));normal.setXYZ(i,n.x,n.y,n.z);}
 smoothed.dispose();
}

// Subdivide just the hand surfaces; keep the shirt, body and limb mesh budget.
// Weld UV duplicates before subdivision so the knuckles aren't split by seams.
export function smoothCourtHands(T,geometry,boneNames){
 const a=geometry.attributes,names=Object.keys(a),source=geometry.index.array;
 const isHand=Array.from({length:a.position.count},(_,i)=>{
  for(let k=0;k<4;k++){
   if(a.skinWeight.getComponent(i,k)>.0001&&!/^(wrist|finger)/.test(boneNames[a.skinIndex.getComponent(i,k)]))return false;
  }
  return true;
 });
 const skin=[],body=[],uv=[],original=[],ids=new Map();
 const point=new T.Vector3();
 function index(id){
  const key=point.fromBufferAttribute(a.position,id).toArray().map(n=>n.toFixed(6)).join(',');
  if(!ids.has(key)){ids.set(key,ids.size);original.push(id);}
  return ids.get(key);
 }
 for(let i=0;i<source.length;i+=3){
  const tri=[source[i],source[i+1],source[i+2]];
  if(!tri.every(id=>isHand[id])){body.push(...tri);continue;}
  const face=tri.map(index);skin.push(...face);
  for(let j=0;j<3;j++){
   uv.push(a.uv.getX(tri[j]),a.uv.getY(tri[j]));
  }
 }
 const patch=new T.BufferGeometry();
 for(const name of names){
  const attr=a[name],values=original.flatMap(id=>Array.from(attr.array.subarray(id*attr.itemSize,(id+1)*attr.itemSize)));
  patch.setAttribute(name,new T.BufferAttribute(new attr.array.constructor(values),attr.itemSize));
 }
 patch.setIndex(skin);patch.userData.cornerUV=uv;
 // Pin the open rim to the unchanged forearm during smoothing.
 patch.userData.pinBoundary=true;
 const smooth=refineSkin(T,patch,1),offset=a.position.count;
 for(const name of names){
  const input=a[name],add=smooth.attributes[name],joined=new input.array.constructor(input.array.length+add.array.length);
  joined.set(input.array);joined.set(add.array,input.array.length);
  geometry.setAttribute(name,new T.BufferAttribute(joined,input.itemSize));
 }
 for(const id of smooth.index.array)body.push(offset+id);
 geometry.setIndex(body);patch.dispose();smooth.dispose();
}
