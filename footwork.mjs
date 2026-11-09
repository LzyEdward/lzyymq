// Stance feet stay fixed in world space. The lifted foot blends back into the
// stride, so changes of direction do not drag the planted sole over the floor.
export class FootPlant {
 constructor(){this.reset();}
 reset(){this.anchor=null;this.planted=false;}
 sample(idealWorld,phase,moving=true){
  const ideal=[...idealWorld];
  if(!moving){this.reset();return ideal;}
  const stance=phase<.5;
  if(!this.anchor||Math.hypot(...ideal.map((v,i)=>v-this.anchor[i]))>1.3)this.anchor=ideal;
  if(stance){if(!this.planted)this.anchor=ideal;this.planted=true;return [...this.anchor];}
  this.planted=false;
  const u=Math.min(1,(phase-.5)/.16),blend=u*u*(3-2*u);
  return ideal.map((v,i)=>this.anchor[i]+(v-this.anchor[i])*blend);
 }
}
