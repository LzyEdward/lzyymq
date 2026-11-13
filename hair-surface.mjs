const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
// Shared cutoff for the scalp shader and opaque hair geometry.
export function hairlineHeight(x,z){
 const front=smooth(.025,.11,z);
 return 1.68+front*(.064+.003*Math.cos(x*43)+.0014*Math.sin(x*191));
}
export function shortHairProfile(x,y,z){
 const edge=y-hairlineHeight(x,z),temple=Math.abs(x)>.075&&y<1.7&&z>.02;
 const crown=smooth(1.735,1.805,y),fade=smooth(0,.018,edge);
 return {edge,covered:edge>=0&&!temple,length:(.0018+crown*.009)*fade,shell:(.0003+crown*.0035)*fade};
}
export const HAIRLINE_GLSL=`
 float hairlineHeight(vec3 p){float front=smoothstep(.025,.11,p.z);return 1.68+front*(.064+.003*cos(p.x*43.)+.0014*sin(p.x*191.));}
`;
