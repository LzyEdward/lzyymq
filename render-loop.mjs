// Exactly one pending frame. A lost WebGL context must stop simulation as well
// as rendering; restarting must never create a second animation chain.
export class RenderLoop {
 constructor(frame,{request=f=>requestAnimationFrame(f),cancel=id=>cancelAnimationFrame(id)}={}){
  this.frame=frame;this.request=request;this.cancel=cancel;this.running=false;this.pending=null;this.frames=0;
  this.tick=now=>{this.pending=null;if(!this.running)return;this.frame(now);this.frames++;if(this.running)this.pending=this.request(this.tick);};
 }
 start(){if(this.running)return;this.pending=this.request(this.tick);this.running=true;}
 stop(){this.running=false;if(this.pending!==null)this.cancel(this.pending);this.pending=null;}
}
