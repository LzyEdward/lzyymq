// Camera-local kinematics keep the racket sweet spot fixed while fitting the grip.
export const ARM_WRIST=[.111,.035,.003], ARM_ELBOW=[.343,-.239,.084];
export function createArmKinematics(T,{side=1,mobility=.14}={}){
 const v=a=>new T.Vector3(...a),wrist=v(ARM_WRIST),elbow=v(ARM_ELBOW),head=v([0,.4896,0]);
 const lowerLength=wrist.distanceTo(elbow),upperLength=.36,shoulder=v([side*.21,-.25,-.10]);
 const maximum=lowerLength+upperLength-.008,shaft=head.clone().sub(wrist);
 const shoulderAt=target=>{
  const direction=target.clone().sub(shoulder),distance=direction.length(),excess=Math.max(0,distance-(maximum-.02));
  // Scapular glide and a small torso reach precede arm extension. The first
  // 2 cm ease in starts before full extension, retaining a little elbow bend.
  // Never teleport the shoulder to an arbitrarily distant ball.
  const shift=Math.min(Math.max(0,mobility),excess<.02?excess*excess/.04:excess-.01);
  return shoulder.clone().addScaledVector(direction,shift/Math.max(distance,1e-8));
 };
 const q=new T.Quaternion(),rotation=new T.Euler(),correction=new T.Quaternion(),trial=new T.Quaternion();
 const axis=new T.Vector3(),aim=new T.Vector3(),sweet=new T.Vector3(),grip=new T.Vector3(),position=new T.Vector3();
 function pose(input){
  q.setFromEuler(rotation.fromArray([...input.rotation,'XYZ']));position.fromArray(input.position);
  sweet.copy(head).applyQuaternion(q).add(position);aim.copy(sweet).sub(shoulder);
  axis.copy(shaft).applyQuaternion(q).normalize();
  correction.setFromUnitVectors(axis,aim.clone().normalize());
  const distance=amount=>{trial.identity().slerp(correction,amount).multiply(q);grip.copy(shaft).applyQuaternion(trial).negate().add(sweet);return grip.distanceTo(shoulderAt(grip));};
  let amount=0;
  if(distance(0)>maximum){
   if(distance(1)>maximum)amount=1;
   else {let lo=0,hi=1;for(let n=0;n<16;n++){const m=(lo+hi)/2;if(distance(m)>maximum)lo=m;else hi=m;}amount=hi;}
  }
  trial.identity().slerp(correction,amount).multiply(q);
  position.copy(sweet).sub(head.clone().applyQuaternion(trial));rotation.setFromQuaternion(trial,'XYZ');
  return {position:position.toArray(),rotation:[rotation.x,rotation.y,rotation.z],reachable:distance(amount)<=maximum+1e-5,correction:amount};
 }
 function chain(group){
  group.updateMatrix();const wristPosition=wrist.clone().applyMatrix4(group.matrix);
  const liveShoulder=shoulderAt(wristPosition),direction=wristPosition.clone().sub(liveShoulder),distance=direction.length();direction.normalize();
  // Keep the anatomical lower arm at its real compiled length. An unreachable
  // assisted hit is reported, rather than silently stretching the hand mesh.
  const usedDistance=Math.min(maximum,Math.max(Math.abs(upperLength-lowerLength)+.002,distance));
  const along=(upperLength*upperLength-lowerLength*lowerLength+usedDistance*usedDistance)/(2*usedDistance);
  const radius=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
  const pole=v([side*.8,-.65,.15]);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbowPosition=liveShoulder.clone().addScaledVector(direction,along).addScaledVector(pole,radius);
  if(distance>maximum)elbowPosition.copy(wristPosition).addScaledVector(direction,-lowerLength);
  return {wrist:wristPosition,elbow:elbowPosition,shoulder:liveShoulder,reachable:distance<=maximum+.002,upperLength,lowerLength,extension:Math.max(0,distance-maximum)};
 }
 return {pose,chain,shoulder:shoulder.clone(),lowerLength,upperLength,maximum};
}

