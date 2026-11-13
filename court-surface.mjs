// PVC sports flooring: small embossed grains, no oversized rubber tile joints.
export function courtRelief(size=128){
 const heights=new Float32Array(size*size);let seed=68417;
 for(let i=0;i<heights.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;heights[i]=seed/4294967296;}
 const normal=new Uint8Array(size*size*4);
 const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x-1,y)-at(x+1,y))*.22,dy=(at(x,y-1)-at(x,y+1))*.22,len=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal.set([Math.round((dx/len*.5+.5)*255),Math.round((dy/len*.5+.5)*255),Math.round((1/len*.5+.5)*255),255],i);
 }
 return {normal,size};
}
export function createCourtRelief(T){
 const {normal,size}=courtRelief(),texture=new T.DataTexture(normal,size,size,T.RGBAFormat);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(39.5,81);
 texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 return texture;
}
