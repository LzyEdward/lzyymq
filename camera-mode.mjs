const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const cameraMode=value=>value==='third'?'third':'first';
export const toggleCameraMode=value=>cameraMode(value)==='first'?'third':'first';
export function orbitLook(view){
 return {yaw:clamp(view.yaw,-1.15,1.15),pitch:clamp(view.pitch,-.85,.32)};
}
// The camera and player facing have separate state. Orbiting cannot turn a
// reachable shuttle into a back-facing miss, or change a chosen landing point.
export function thirdPersonPose({player,jump=0,yaw=0,pitch=-.28,lift=0}={}){
 const view=orbitLook({yaw,pitch}),height=clamp(lift,0,3.2),distance=6.2+height*.65;
 const target={x:player.x,y:1.12+jump*.45+height*1.35,z:player.z-.45};
 const horizontal=Math.cos(view.pitch)*distance;
 const position={x:clamp(target.x+Math.sin(view.yaw)*horizontal,-7.4,7.4),
  y:clamp(target.y-Math.sin(view.pitch)*distance,2.4,10),
  z:clamp(target.z+Math.cos(view.yaw)*horizontal,.7,13.2)};
 return {position,target};
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
