// Seconds and camera-local metres. Motion never slows the simulation.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
// C1 keyframe curves carry momentum through contact. Smoothstep on every
// segment made the racket stop at the very instant it should strike fastest.
function keyCurve(keys,index,elapsed,property,gain){
 const a=keys[index-1],b=keys[index],duration=b[0]-a[0],u=clamp((elapsed-a[0])/duration,0,1),u2=u*u,u3=u2*u;
 const tangent=i=>{
  if(i===0||i===keys.length-1)return [0,0,0];
  const before=keys[i-1],after=keys[i+1],here=keys[i],slope=after[1][property].map((x,k)=>(x-before[1][property][k])/(after[0]-before[0]));
  // Bound tangents by adjacent segment speeds; a rescue contact must not
  // fling a Hermite overshoot toward the near plane or away from the arm.
  const speed=p=>Math.hypot(...p[1][property].map((x,k)=>x-here[1][property][k]))/Math.abs(p[0]-here[0]);
  const cap=Math.min(speed(before),speed(after))*1.5,length=Math.hypot(...slope),scale=Math.min(gain,cap/Math.max(length,1e-9));
  return slope.map(x=>x*scale);
 };
 const ma=tangent(index-1),mb=tangent(index);
 return a[1][property].map((x,k)=>(2*u3-3*u2+1)*x+(u3-2*u2+u)*duration*ma[k]+(-2*u3+3*u2)*b[1][property][k]+(u3-u2)*duration*mb[k]);
}
// Left hand pinches the feather skirt before the toss, then withdraws without
// following the airborne shuttle. Returns camera-local offset from the cork.
export function serveSupportPose({phase='serve',elapsed=0,swing=0}={}){
 const serving=phase==='serve'||phase==='serving',after=phase==='rally'&&swing>=.2&&swing<.37;
 if(!serving&&!after)return null;
 const release=phase==='serving'?clamp((elapsed-.025)/.15,0,1):after?1:0;
 const withdraw=smooth(release),rotation=[-.10-withdraw*.12,-.26,-.20-withdraw*.20];
 return {offset:[-.018-withdraw*.15,.042-withdraw*.18,.012+withdraw*.045],rotation,release};
}
export function swingPose({elapsed=0,kind='clear',contact=null,contactTime=.095,armed=false,time=0,speed=0,power=0}={}){
 const idle={position:[.32,-.42,-.86],rotation:[.12,-.10,-.10]};
 if(elapsed<=0){idle.position[1]+=armed?.035:0;idle.position[0]+=Math.sin(time*6)*Math.min(speed,5)*.0012;idle.position[1]+=Math.cos(time*12)*Math.min(speed,5)*.001;return idle;}
 const slice=kind==='slicesmash'||kind==='slicedrop';
 const overhead=kind==='clear'||kind==='smash'||kind==='drop'||slice,serve=kind==='serve',under=kind==='lift'||serve,drive=kind==='drive',netPlay=kind==='net'||kind==='netcross'||kind==='push'||kind==='netkill';
 const backhand=contact&&contact[0]<-.15;
 const rotation=backhand?[.20,.12,.32]:kind==='net'?[.04,-.28,-.72]:kind==='netcross'?[.10,-.34,-.58]:kind==='push'?[.16,-.30,-.34]:kind==='netkill'?[.42,-.10,-.66]:kind==='drop'?[.18,-.13,-.34]:overhead?[.30,-.08,-.42]:under?[-.48,-.12,.12]:drive?[.05,-.2,-.18]:[.10,-.08,-.12];
 if(slice){rotation[1]+=.48;rotation[2]+=.25;}
 // Rotate the sweet-spot offset using XYZ Euler, without a Three.js dependency.
 const head=[0,.4896,0],rx=rotation[0],ry=rotation[1],rz=rotation[2];
 let x=-head[1]*Math.sin(rz),y=head[1]*Math.cos(rz),z=0;
 const xx=x*Math.cos(ry)+z*Math.sin(ry),zz=-x*Math.sin(ry)+z*Math.cos(ry);x=xx;z=zz;
 const yy=y*Math.cos(rx)-z*Math.sin(rx);z=y*Math.sin(rx)+z*Math.cos(rx);y=yy;
 const at=contact||[.28,overhead?.05:-.12,-1.12];
 const hit={position:[at[0]-x,at[1]-y,at[2]-z],rotation};
 const prep={position:serve?[.36,-.62,-.70]:kind==='net'?[.48,-.24,-.68]:kind==='netcross'?[.52,-.20,-.7]:kind==='push'?[.56,-.30,-.74]:kind==='netkill'?[.42,-.08,-.70]:kind==='drop'?[.44,-.14,-.68]:drive?[.54,-.34,-.76]:overhead?[.45,-.17,-.70]:under?[.39,-.60,-.77]:[.45,-.39,-.72],rotation:serve?[-.22,.22,.78]:kind==='net'?[.24,.18,-.82]:kind==='netcross'?[.20,.30,-.68]:kind==='push'?[.12,.32,-.46]:kind==='netkill'?[-.28,.18,-.9]:kind==='drop'?[-.72,.14,-.68]:drive?[-.04,.36,.1]:overhead?[-.8,.22,-.85]:under?[-.35,.12,.48]:[.05,.28,.3]};
 const follow={position:kind==='net'?[.16,-.35,-.98]:kind==='netcross'?[.12,-.38,-.98]:kind==='push'?[.10,-.42,-1.00]:kind==='netkill'?[.02,-.45,-.96]:kind==='drop'?[.08,-.40,-.91]:drive?[.08,-.38,-.97]:overhead?[-.07,-.47,-.93]:under?[.06,-.27,-1.04]:[-.02,-.42,-1.02],rotation:kind==='net'?[.58,-.08,-1.02]:kind==='netcross'?[.66,.20,-.86]:kind==='push'?[.35,-.22,-.66]:kind==='netkill'?[.82,-.15,-1.12]:kind==='drop'?[.62,-.08,-.88]:drive?[.22,-.3,-.48]:overhead?[1.05,-.20,-1.32]:under?[.25,-.4,-.6]:[.5,-.3,-.9]};
 if(backhand){prep.position=[-.2,-.26,-.77];prep.rotation=[-.1,-.15,.65];follow.position=[.34,-.49,-1.02];follow.rotation=[.65,.25,.5];}
 // Drops disguise the same overhead preparation, then decelerate; slices
 // brush across the cork with an open face and a lateral follow-through.
 if(kind==='drop'||kind==='slicedrop'){prep.rotation=[-.84,.18,-.78];prep.position=[.44,-.10,-.69];follow.rotation=[.46,.03,-.60];}
 if(slice){prep.rotation[1]+=.22;follow.position=[-.23,kind==='slicesmash'?-.48:-.33,-.92];follow.rotation=[kind==='slicesmash'?.95:.48,-.48,-.74];}
 if(kind==='netcross'){prep.rotation=[.12,.42,-.53];follow.position=[-.20,-.32,-.98];follow.rotation=[.34,-.52,-.40];}
 if(power>.8){follow.position[1]-=.055;follow.rotation[0]+=.14;}
 const prepTime=contactTime<.07?Math.max(.012,contactTime*.48):.048;
 const hitTime=Math.max(prepTime+.01,contactTime);
 const followTime=Math.max(hitTime+.065,.255-power*.015),recoverTime=Math.max(followTime+.15,.46);
 const keys=[[0,idle],[prepTime,prep],[hitTime,hit],[followTime,follow],[recoverTime,idle]];
 const momentum=kind==='smash'||kind==='slicesmash'||kind==='netkill'?.9:kind==='drop'||kind==='slicedrop'?.48:netPlay?.56:.72;
 for(let i=1;i<keys.length;i++)if(elapsed<=keys[i][0])return {position:keyCurve(keys,i,elapsed,'position',momentum),rotation:keyCurve(keys,i,elapsed,'rotation',momentum)};
 return idle;
}

export function moveVelocity(current,desired,dt){
 const reversal=current*desired<0,rate=desired===0?32:reversal?30:23;
 return current+(desired-current)*(1-Math.exp(-rate*Math.max(0,dt)));
}

// Small vestibular motion with a trace of body weight. The camera itself is
// damped by the game loop; this offset supplies the stride and lean cues.
export function groundedCameraOffset({speed=0,lateral=0,forward=0,phase=0,intensity=1}={}){
 const weight=Math.min(1,Math.max(0,speed/5.25))*Math.max(0,Math.min(1,intensity));
 return {
  x:(lateral===0?0:-lateral*.026*intensity)+Math.sin(phase)*weight*.006,
  y:Math.sin(phase*2)*weight*.012,
  z:forward===0?0:-forward*.026*intensity,
  roll:lateral===0?0:clamp(-lateral*.0022,-.018,.018)*intensity,
 };
}
