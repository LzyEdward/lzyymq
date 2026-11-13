const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
export function trackAngles(eye,ball,velocity={x:0,y:0,z:0},previousYaw=0){
 // Use the real horizontal distance, including near-vertical and behind-head
 // trajectories. At the pole, keep azimuth stable instead of spinning 180°.
 const lead=.045,dx=ball.x-eye.x+velocity.x*lead,dz=ball.z-eye.z+velocity.z*lead;
 const dy=ball.y-eye.y+velocity.y*lead,horizontal=Math.hypot(dx,dz);
 const yaw=horizontal<.24?previousYaw:Math.atan2(-dx,-dz);
 return {yaw,pitch:clamp(Math.atan2(dy,Math.max(.015,horizontal)),-1.42,1.545)};
}
export function stepTracking(current,goal,dt){
 const alpha=1-Math.exp(-18*Math.max(0,dt));
 return {yaw:current.yaw+angleDelta(current.yaw,goal.yaw)*alpha,pitch:current.pitch+(goal.pitch-current.pitch)*alpha};
}

// Vertical assistance is deliberately independent of azimuth. It uses forward
// depth in the mouse's current view, the real eye height and the vertical FOV.
// The shuttle is allowed to occupy the upper part of the screen; low balls
// never pull the view downward and a ball behind the player never turns them.
export function highBallOffset({eye,ball,yaw=0,manualPitch=0,fov=69,enabled=true}){
 if(!enabled)return 0;
 const dx=ball.x-eye.x,dy=ball.y-eye.y,dz=ball.z-eye.z;
 const forward=-dx*Math.sin(yaw)-dz*Math.cos(yaw);
 if(forward<-.12||dy<=0)return 0;
 const elevation=Math.atan2(dy,Math.max(.015,forward));
 const upperAngle=Math.atan(Math.tan(clamp(fov,35,100)*Math.PI/360)*.38);
 return clamp(elevation-upperAngle-manualPitch,0,Math.max(0,1.545-manualPitch));
}
export function stepHighBallOffset(current,target,dt){
 const rate=target>current?11:3.2;
 return current+(target-current)*(1-Math.exp(-rate*Math.max(0,dt)));
}
