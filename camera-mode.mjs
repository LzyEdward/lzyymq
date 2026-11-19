const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const cameraMode=value=>value==='first'?'first':'third';
export const toggleCameraMode=value=>cameraMode(value)==='first'?'third':'first';
export function orbitLook(view){
 return {yaw:clamp(view.yaw,-1.15,1.15),pitch:clamp(view.pitch,-.85,.32)};
}
// The camera and player facing have separate state. Orbiting cannot turn a
// reachable shuttle into a back-facing miss, or change a chosen landing point.
export function thirdPersonPose({player,jump=0,yaw=0,pitch=-.28,lift=0}={}){
 const view=orbitLook({yaw,pitch}),height=clamp(lift,0,3.2),distance=6.2+height*.65;
 const sideX=Math.cos(view.yaw),sideZ=-Math.sin(view.yaw);
 const target={x:player.x+sideX*.52,y:1.12+jump*.45+height*1.35,z:player.z-.65+sideZ*.52};
 const horizontal=Math.cos(view.pitch)*distance;
 const position={x:clamp(target.x+Math.sin(view.yaw)*horizontal+sideX*.52,-7.4,7.4),
  y:clamp(target.y-Math.sin(view.pitch)*distance,2.4,10),
  z:clamp(target.z+Math.cos(view.yaw)*horizontal+sideZ*.52,.7,13.2)};
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
 if(!enabled||Math.hypot(ball.x-player.x,ball.z-player.z)>7)return 0;
 return clamp((ball.y-3)*.5,0,3.2);
}
// The shared athlete animation reaches contact at .135s. Preserve the player's
// much faster gameplay timing and map the visual wind-up/recovery around it.
export function avatarSwingTime(elapsed,contactTime,recovery){
 if(elapsed<=0)return 0;
 const contact=Math.max(.001,contactTime),end=Math.max(contact+.05,recovery);
 return elapsed<=contact?elapsed/contact*.135:
  .135+clamp((elapsed-contact)/(end-contact),0,1)*.415;
}
