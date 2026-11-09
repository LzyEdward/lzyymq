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
