// Paint lies on the existing frame UVs; no floating decals or extra draw calls.
const navy=[17,30,48],blue=[39,101,168],ice=[141,185,219],white=[232,239,244],orange=[239,99,38];
const fract=x=>x-Math.floor(x);
export function framePaint(u,v){
 u=fract(u);v=fract(v);
 const front=Math.abs(Math.sin(v*Math.PI*2));
 let rgb=navy,roughness=.33;
 // Asymmetric shoulder panel and tapered slash ribbons around the lower hoop.
 const diagonal=u+(v<.5?v:.5-v)*.032;
 if(u>.025&&u<.105){rgb=orange;roughness=.29;}
 if(u>.31&&u<.91){
  const band=fract(diagonal*17),edge=Math.min((u-.31)/.08,(.91-u)/.08,1);
  if(band<.15*edge)rgb=white;
  else if(band<.28*edge)rgb=ice;
  else if(band<.76)rgb=blue;
 }
 // Very restrained fibre under the lacquer, not metallic glitter.
 const fibre=(Math.sin((u*1024+v*16)*Math.PI)*Math.sin(v*128*Math.PI))*.9;
 const shade=.91+.09*front;
 return {rgb:rgb.map(n=>Math.round(Math.max(0,Math.min(255,n*shade+fibre)))),roughness};
}
export function frameFinishPixels(width=1024,height=128){
 const color=new Uint8Array(width*height*4),roughness=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=framePaint(x/width,y/height);
  color.set([...p.rgb,255],i*4);const r=Math.round(p.roughness*255);roughness.set([r,r,r,255],i*4);
 }
 return {color,roughness,width,height};
}
export function createFrameFinish(T){
 const pixels=frameFinishPixels();
 const configure=t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 let color=configure(new T.DataTexture(pixels.color,pixels.width,pixels.height,T.RGBAFormat));
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=pixels.width;canvas.height=pixels.height;const c=canvas.getContext('2d');
  if(c?.putImageData&&typeof ImageData!=='undefined'){
   c.putImageData(new ImageData(new Uint8ClampedArray(pixels.color),pixels.width,pixels.height),0,0);
   c.fillStyle='#e9eff3';c.font='600 7px Arial';c.textAlign='center';
   for(const y of [32,96]){c.fillText('ASTROX',pixels.width*.82,y);c.fillText('100 ZZ',pixels.width*.37,y);}
   color.dispose();color=configure(new T.CanvasTexture(canvas));
  }
 }
 color.colorSpace=T.SRGBColorSpace;
 const roughness=configure(new T.DataTexture(pixels.roughness,pixels.width,pixels.height,T.RGBAFormat));
 return {map:color,roughnessMap:roughness};
}
