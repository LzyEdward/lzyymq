// Rendering frequency is independent of the 120 Hz match simulation.
export class RenderBudget {
 constructor(){this.next=0;this.last=null;this.mode='';this.dirty=true;}
 invalidate(){this.dirty=true;}
 take(now,{screen='menu',hidden=false}={}){
  const active=['play','review'].includes(screen),animated=['menu','inspect','net-inspect','swing-inspect'].includes(screen);
  const hz=active?60:screen==='menu'?15:30,mode=hidden?'hidden':active?'active':screen;
  if(mode!==this.mode){this.mode=mode;this.next=now;this.last=null;this.dirty=true;}
  if(hidden)return null;
  if(!active&&!animated&&!this.dirty)return null;
  if(now+.15<this.next&&!this.dirty)return null;
  const interval=1000/hz,elapsed=this.last===null?interval:now-this.last;
  this.next=now< this.next+interval*2?this.next+interval:now+interval;
  this.last=now;this.dirty=false;return elapsed;
 }
}

export function renderProfile(mode='auto',scale=1,width=1280,height=720,dpr=1){
 const detail=mode==='high'||mode==='ultra';
 const cap=mode==='ultra'?1.5:mode==='high'?1.2:mode==='balanced'?.85:1;
 const pixels=detail?2073600:921600;
 const ratio=Math.min(Math.max(.5,dpr),cap,Math.sqrt(pixels/Math.max(1,width*height)))*Math.max(.5,Math.min(1,scale));
 return {ratio,quality:detail?mode:'balanced',shadows:detail,samples:mode==='ultra'?2:0};
}

export class AdaptiveResolution {
 constructor(){this.scale=1;this.samples=[];this.nextCheck=0;}
 reset(now=0){this.scale=1;this.samples=[];this.nextCheck=now+4000;}
 sample(ms,now){
  if(ms<=0||ms>150)return false;
  this.samples.push(ms);if(this.samples.length>180)this.samples.shift();
  if(now<this.nextCheck||this.samples.length<120)return false;
  this.nextCheck=now+4000;
  const sorted=[...this.samples].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],p90=sorted[Math.floor(sorted.length*.9)];
  this.samples=[];
  if(median>24||p90>38){const next=Math.max(.65,Math.round((this.scale-.1)*100)/100);if(next<this.scale){this.scale=next;return true;}}
  // Never oscillate back to a hotter setting during a match.
  return false;
 }
}
