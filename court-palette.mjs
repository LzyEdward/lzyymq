export const COURT_PALETTES={
 event:{label:'赛事原色'},
 classic:{label:'经典绿',court:'#34786c',runoff:'#41494a'},
 vivid:{label:'鲜亮绿',court:'#20d44b',runoff:'#24783b'},
 pink:{label:'活力粉',court:'#e36aae',runoff:'#78415e'},
 blue:{label:'海风蓝',court:'#3285c4',runoff:'#365b77'},
 violet:{label:'晴空紫',court:'#8764bf',runoff:'#514370'},
 coral:{label:'珊瑚红',court:'#d96259',runoff:'#704849'},
 amber:{label:'暖金色',court:'#d2a43d',runoff:'#65543a'},
 aqua:{label:'清透青',court:'#55b6bb',runoff:'#376d73'}
};

const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
const srgbLuminance=([r,g,b])=>(.2126*r+.7152*g+.0722*b)/255;

export function recolorCourtPixels(source,targetHex,baseHex='#34786c'){
 if(!(source instanceof Uint8ClampedArray)||source.length%4!==0)throw new TypeError('Court pixels must be RGBA bytes.');
 const parse=hex=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16));
 const target=parse(targetHex),base=parse(baseHex),baseLight=srgbLuminance(base);
 const result=new Uint8ClampedArray(source.length);
 for(let i=0;i<source.length;i+=4){
  const light=srgbLuminance([source[i],source[i+1],source[i+2]]);
  const shade=Math.max(.72,Math.min(1.26,light/baseLight));
  result[i]=clamp(target[0]*shade);result[i+1]=clamp(target[1]*shade);result[i+2]=clamp(target[2]*shade);result[i+3]=source[i+3];
 }
 return result;
}
