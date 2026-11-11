// One action map is shared by keyboard input and the playable control checks.
export function keyCommand(code){
 if(code==='Space'||code==='KeyQ')return {action:'jump'};
 if(code==='KeyJ')return {action:'hit',kind:'auto'};
 if(code==='KeyK')return {action:'hit',kind:'clear'};
 if(code==='KeyE')return {action:'hit',kind:'drop'};
 if(code==='KeyL')return {action:'hit',kind:'smash'};
 if(code==='Digit8'||code==='Numpad8')return {action:'hit',kind:'slicesmash'};
 if(code==='Digit9'||code==='Numpad9')return {action:'hit',kind:'slicedrop'};
 const shots={Digit1:'auto',Digit2:'clear',Digit3:'drop',Digit4:'smash',Digit5:'net',Digit6:'push',Digit7:'netcross',Numpad1:'auto',Numpad2:'clear',Numpad3:'drop',Numpad4:'smash',Numpad5:'net',Numpad6:'push',Numpad7:'netcross'};
 if(shots[code])return {action:'hit',kind:shots[code]};
 return null;
}

export function pointerCommand(button){
 return button===0?{action:'hit',kind:'auto'}:button===2?{action:'hit',kind:'smash'}:null;
}

export class JumpMotion {
 constructor(){this.reset();}
 reset(){this.height=0;this.velocity=0;this.buffer=0;this.cooldown=0;this.landing=0;this.count=0;}
 request(){this.buffer=.16;}
 step(dt,stamina=100){
  dt=Math.max(0,dt);let launched=false,landed=false,cost=0;
  this.cooldown=Math.max(0,this.cooldown-dt);this.landing*=Math.exp(-20*dt);
  if(this.buffer>0&&this.height===0&&this.velocity===0&&this.cooldown===0&&stamina>=10){
   this.velocity=5.6;this.buffer=0;this.count++;launched=true;cost=10;
  }
  this.buffer=Math.max(0,this.buffer-dt);
  if(this.height>0||this.velocity>0){
   this.height+=this.velocity*dt-8.25*dt*dt;this.velocity-=16.5*dt;
   if(this.height<=0){this.height=0;this.velocity=0;this.cooldown=.045;this.landing=1;landed=true;}
  }
  return {height:this.height,velocity:this.velocity,launched,landed,cost};
 }
 cancelBuffer(){this.buffer=0;}
}

// Manual placement stays authoritative until the next incoming opponent stroke.
export class MovementOwnership {
 constructor(){this.reset();}
 reset(){this.manual=false;this.lastIncoming=null;}
 step({active=false,rally=0,lastHitter='player',phase='serve'}={}){
  if(phase==='serve'||phase==='opponentServe')this.reset();
  const incoming=phase==='rally'&&lastHitter==='opponent';
  if(incoming&&this.lastIncoming!==rally){this.manual=false;this.lastIncoming=rally;}
  if(active)this.manual=true;
  return this.manual;
 }
}
