// Paint lies on the existing frame UVs; no floating decals or extra draw calls.
import {RACKET_SKINS,racketSkin} from './racket-catalog.mjs';
const navy=[17,30,48],blue=[39,101,168],ice=[141,185,219],white=[232,239,244],orange=[239,99,38];
const fract=x=>x-Math.floor(x);
const rgbHex=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const pigments=new Map(Object.values(RACKET_SKINS).map(s=>[s,[s.palette.carbon,s.palette.rim,s.palette.accent,s.palette.gold].map(rgbHex)]));
// t travels from crown (0) down either side to the T-joint (1).
// Pigment indices are carbon, main paint, highlight and trim.
const newPatterns={
 sabre:(t,left,line)=>t>.70?3:t>.31&&t<.52&&line<.22?2:1,
 blade:(t,left,line)=>t<.26||t>.68?1:line<.19?3:2,
 scale:(t,left,line)=>t<.19?1:t>.62?0:line<.47?1:line<.56?2:0,
 pulse:(t,left,line)=>t>.70?1:t<.12?2:left&&t>.26&&t<.60&&line<.5?3:0,
 fault:(t,left,line)=>t>.76?3:t>.65?1:t>.26&&t<.46&&line<.29?2:0,
 tide:(t,left,line)=>t>.72?3:left&&t<.51?1:t>.35&&t<.68&&line<.26?2:0,
 split:(t,left,line)=>t>.81?0:t<.12?2:left?1:3,
 wing:(t,left,line)=>t>.6?3:t<.32?1:line<.46?2:0,
 rail:(t,left,line,v)=>t>.66?0:Math.abs(Math.sin(v*2*Math.PI))>.89?3:1,
 circuit:(t,left,line)=>t<.18?1:t>.48&&t<.8&&line<.35?3:t>.74?2:0,
 home:(t,left,line)=>t<.19||t>.80?1:t>.65||t>.53&&t<.58?3:2,
 laurel:(t,left,line)=>t<.09||t>.66&&t<.73||t>.77&&t<.81?1:t<.49&&t>.18&&line<.28?2:0
};
export function framePaint(u,v,skin='astrox100zz'){
 u=fract(u);v=fract(v);
 const front=Math.abs(Math.sin(v*Math.PI*2));
 let rgb=navy,roughness=.33;
 // Asymmetric shoulder panel and tapered slash ribbons around the lower hoop.
 const diagonal=u+(v<.5?v:.5-v)*.032;
 const spec=racketSkin(skin);
 if(spec.pattern==='navy'){
 if(u>.025&&u<.105){rgb=orange;roughness=.29;}
 if(u>.31&&u<.91){
  const band=fract(diagonal*17),edge=Math.min((u-.31)/.08,(.91-u)/.08,1);
  if(band<.15*edge)rgb=white;
  else if(band<.28*edge)rgb=ice;
  else if(band<.76)rgb=blue;
 }
 }else{
  const [base,accent,light,detail]=pigments.get(spec);
  const slash=fract((u+Math.sin(v*Math.PI*2)*.018)*29);
  rgb=base;
  const motif=newPatterns[spec.pattern];
  if(motif){
   const distance=2*Math.abs(fract(u+.25)-.5),left=u>.25&&u<.75;
   rgb=pigments.get(spec)[motif(distance,left,fract(distance*10+Math.sin(2*Math.PI*v)*.28),v)];
  }else if(spec.pattern==='silver'){
   if(u<.36||u>.94)rgb=light;
   if((u<.065||u>.935)||(u>.45&&u<.56))rgb=detail;
   if(slash<.22&&(u<.42||u>.85))rgb=accent;
  }else if(spec.pattern==='lightning'){
   if((u>.192&&u<.308)||(u>.69&&u<.81))rgb=accent;
   if(((u>.165&&u<.205)||(u>.295&&u<.335)||(u>.655&&u<.70)||(u>.8&&u<.845))&&slash<.55)rgb=accent;
   if(u>.725&&u<.775&&slash<.12)rgb=base;
  }else if(spec.pattern==='emerald'){
   if(u>.045&&u<.455)rgb=accent;
   if((u>.025&&u<.055)||(u>.445&&u<.475))rgb=detail;
   if(slash<.13&&u>.49&&u<.94)rgb=light;
  }else if(spec.pattern==='pearl'){
   rgb=(u>.16&&u<.34)||(u>.66&&u<.84)?base:accent;
   if(slash<.16&&(u<.19||u>.31&&u<.69||u>.81))rgb=light;
  }else if(spec.pattern==='orange'){
   if(u<.155||u>.955)rgb=accent;
   if(slash<.30&&((u>.31&&u<.44)||(u>.53&&u<.67)||(u>.84&&u<.95)))rgb=detail;
   if(slash>.86&&u>.30&&u<.94)rgb=light;
  }else{
   rgb=u>.10&&u<.66?accent:base;
   if(slash<.11&&u>.14&&u<.7)rgb=light;
  }
  roughness=rgb===base?.35:.27;
 }
 // Very restrained fibre under the lacquer, not metallic glitter.
 const fibre=(Math.sin((u*1024+v*16)*Math.PI)*Math.sin(v*128*Math.PI))*.9;
 const shade=.91+.09*front;
 return {rgb:rgb.map(n=>Math.round(Math.max(0,Math.min(255,n*shade+fibre)))),roughness};
}
export function frameFinishPixels(width=1024,height=128,skin='astrox100zz'){
 const color=new Uint8Array(width*height*4),roughness=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=framePaint(x/width,y/height,skin);
  color.set([...p.rgb,255],i*4);const r=Math.round(p.roughness*255);roughness.set([r,r,r,255],i*4);
 }
 return {color,roughness,width,height};
}
export function createFrameFinish(T,skin='astrox100zz'){
 const pixels=frameFinishPixels(1024,128,skin),spec=racketSkin(skin);
 const configure=t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 let color=configure(new T.DataTexture(pixels.color,pixels.width,pixels.height,T.RGBAFormat));
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=pixels.width;canvas.height=pixels.height;const c=canvas.getContext('2d');
  if(c?.putImageData&&typeof ImageData!=='undefined'){
   c.putImageData(new ImageData(new Uint8ClampedArray(pixels.color),pixels.width,pixels.height),0,0);
   c.fillStyle='#e9eff3';c.font='600 7px Arial';c.textAlign='center';
   for(const y of [32,96]){c.fillText(spec.family,pixels.width*.82,y);c.fillText(spec.mark,pixels.width*.37,y);}
   color.dispose();color=configure(new T.CanvasTexture(canvas));
  }
 }
 color.colorSpace=T.SRGBColorSpace;
 const roughness=configure(new T.DataTexture(pixels.roughness,pixels.width,pixels.height,T.RGBAFormat));
 return {map:color,roughnessMap:roughness};
}
