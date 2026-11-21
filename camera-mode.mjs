const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const cameraMode=value=>value==='first'?'first':'third';
export const toggleCameraMode=value=>cameraMode(value)==='first'?'third':'first';
export const thirdPersonDistance=value=>value==='wide'?7.15:4.55;
export const THIRD_PERSON_PITCH=-.32;
export const thirdPersonFov=lift=>61+5.6*clamp(lift,0,3.2);
export function orbitLook(view){
 return {yaw:clamp(view.yaw,-1.15,1.15),pitch:clamp(view.pitch,-.85,.32)};
}
// The camera and player facing have separate state. Orbiting cannot turn a
// reachable shuttle into a back-facing miss, or change a chosen landing point.
export function thirdPersonPose({player,jump=0,yaw=0,pitch=THIRD_PERSON_PITCH,lift=0,framing='near'}={}){
 const view=orbitLook({yaw,pitch}),height=clamp(lift,0,3.2);
 const distance=thirdPersonDistance(framing)+height*.70;
 const sideX=Math.cos(view.yaw),sideZ=-Math.sin(view.yaw);
 const target={x:player.x+sideX*.37,y:1.24+jump*.38+height*1.24,z:player.z-.36+sideZ*.37};
 const horizontal=Math.cos(view.pitch)*distance;
 const position={x:clamp(target.x+Math.sin(view.yaw)*horizontal+sideX*.63,-7.4,7.4),
  y:clamp(1.58+jump*.34+height*.65-Math.sin(view.pitch)*distance,2.4,10),
  z:clamp(target.z+Math.cos(view.yaw)*horizontal+sideZ*.40,.7,13.2)};
 return {position,target};
}
// Ray from shuttle to camera, checked against simple body volumes. The closest
// point must be between the two so a shuttle in front of the player stays clear.
export function avatarObstruction(eye,shuttle,player,jump=0){
 const dx=eye.x-shuttle.x,dy=eye.y-shuttle.y,dz=eye.z-shuttle.z;
 const volume=(height,width,vertical,depth)=>{
  const x=(shuttle.x-player.x)/width,y=(shuttle.y-jump-height)/vertical,z=(shuttle.z-player.z)/depth;
  const vx=dx/width,vy=dy/vertical,vz=dz/depth;
  const length=vx*vx+vy*vy+vz*vz;
  if(length<1e-6)return 0;
  const t=-(x*vx+y*vy+z*vz)/length;
  if(t<-.025||t>=1)return 0;
  const distance=Math.hypot(x+vx*t,y+vy*t,z+vz*t);
  return clamp((1.16-distance)/.32,0,1);
 };
 return Math.max(volume(1.21,.32,.48,.27),volume(1.69,.16,.20,.18),volume(.52,.27,.57,.27));
}
export function thirdPersonLift({player,ball,enabled=false}={}){
 if(!enabled)return 0;
 // Ease in over several metres as the high clear approaches the player's half.
 const range=Math.hypot(ball.x-player.x,ball.z-player.z);
 return clamp((ball.y-2.9)*.56,0,3.2)*clamp((12-range)/6,0,1);
}

// Keep the lateral direction as the shuttle passes behind the camera.
// Rear depth biases the arrow toward the bottom edge instead of mirroring it.
export function shuttleScreenCue({x,y,z},fov,aspect){
 const depth=-z,tan=Math.tan(fov*Math.PI/360);
 const scale=Math.max(.01,Math.abs(depth))*tan;
 const px=x/(scale*aspect),py=(y-Math.max(0,z)*1.3)/scale;
 if(depth>0&&Math.abs(px)<.96&&Math.abs(py)<.9)return {x:px,y:py,edge:false};
 if(depth<=0&&Math.hypot(px,py)<.18)return {x:0,y:-.76,angle:180,edge:true};
 const ratio=Math.max(Math.abs(px)/.89,Math.abs(py)/.76,.001);
 return {x:px/ratio,y:py/ratio,angle:Math.atan2(px*aspect,py)*180/Math.PI,edge:true};
}
// The shared athlete animation reaches contact at .135s. Preserve the player's
// much faster gameplay timing and map the visual wind-up/recovery around it.
export function avatarSwingTime(elapsed,contactTime,recovery){
 if(elapsed<=0)return 0;
 const contact=Math.max(.001,contactTime),end=Math.max(contact+.05,recovery);
 return elapsed<=contact?elapsed/contact*.135:
  .135+clamp((elapsed-contact)/(end-contact),0,1)*.415;
}
