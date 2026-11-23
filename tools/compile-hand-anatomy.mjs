// Build a static grip from the existing CC0 anatomical topology. This is an
// inspection prototype until the real hand, seams and grip clearance pass QA.
import * as T from 'three';
import * as data from '../assets/athlete-data.mjs';
import {writeFile} from 'node:fs/promises';
import {refineSkin} from '../skin-surface.mjs';
import {handTint,handUV} from '../hand-surface.mjs';
import {gripRig} from '../grip-rig.mjs';
import {pathToFileURL} from 'node:url';
import {readFileSync,existsSync} from 'node:fs';
import jpeg from 'jpeg-js';

const V=(...p)=>new T.Vector3(...p),bones=new Map(data.bones.map(b=>[b.name,V(...b.position)]));
const wrist=bones.get('wrist.R'),elbow=bones.get('lowerarm01.R');
const sourceArm=elbow.clone().sub(wrist).normalize();
const skinFile=new URL('../assets/textures/athlete-skin.jpg',import.meta.url);
const skinPixels=existsSync(skinFile)?jpeg.decode(readFileSync(skinFile),{useTArray:true}):null;
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function skinColor(uv,p){
 if(!skinPixels)return handTint(...p);
 const x=Math.max(0,Math.min(skinPixels.width-1,Math.round(uv[0]*(skinPixels.width-1)))),y=Math.max(0,Math.min(skinPixels.height-1,Math.round((1-uv[1])*(skinPixels.height-1)))),offset=(y*skinPixels.width+x)*4;
 return [0,1,2].map(k=>linear(skinPixels.data[offset+k]/255));
}
export function buildAnatomicalHand(open=false){
 const {matrices,segment}=gripRig(T,bones,open);
 matrices.set('lowerarm01.R',segment(elbow,wrist,V(.343,-.239,.084),V(.111,.035,.003),.87,.87));
 const vertex=i=>({p:V(data.positions[i*3],data.positions[i*3+1],data.positions[i*3+2]),uv:[data.uvs[i*2],data.uvs[i*2+1]],weights:new Map(Array.from({length:4},(_,k)=>[data.skinIndex[i*4+k],data.skinWeight[i*4+k]]))});
 const mix=(a,b,t)=>{const weights=new Map();for(const [j,w] of a.weights)weights.set(j,w*(1-t));for(const [j,w] of b.weights)weights.set(j,(weights.get(j)||0)+w*t);return {p:a.p.clone().lerp(b.p,t),uv:a.uv.map((u,i)=>u+(b.uv[i]-u)*t),weights};};
 const metric=v=>.263-v.p.clone().sub(wrist).dot(sourceArm);
 const vertices=[],indices=[],sourceUV=[],lookup=new Map();
 function append(v){
  const key=v.p.toArray().map(n=>n.toFixed(7)).join(',');if(lookup.has(key))return lookup.get(key);
  const p=V();let sum=0;for(const [j,w] of v.weights){const matrix=matrices.get(data.bones[j]?.name);if(matrix&&w>0){p.addScaledVector(v.p.clone().applyMatrix4(matrix),w);sum+=w;}}
  if(!sum)throw Error('Anatomical hand has unbound vertices');p.divideScalar(sum);
  // Project skin out of the solid octagonal grip before smooth subdivision.
  if(!open&&p.y>-.012&&p.y<.16&&Math.hypot(p.x,p.z)<.0148){const r=Math.hypot(p.x,p.z)||1;p.x*=.0148/r;p.z*=.0148/r;}
  const i=vertices.length/3;vertices.push(...p.toArray());sourceUV.push(v.uv);lookup.set(key,i);return i;
 }
 for(let n=0;n<data.indices0.length;n+=3){
  let polygon=Array.from(data.indices0.slice(n,n+3),vertex);
  if(!polygon.every(v=>v.p.x<-.36))continue;
  const clipped=[];for(let j=0;j<3;j++){const a=polygon[j],b=polygon[(j+1)%3],da=metric(a),db=metric(b);if(da>=0)clipped.push(a);if((da>=0)!==(db>=0))clipped.push(mix(a,b,da/(da-db)));}
  for(let j=1;j<clipped.length-1;j++)indices.push(append(clipped[0]),append(clipped[j]),append(clipped[j+1]));
 }
 // Close the cut at the elbow using a fan whose edge order comes from the
 // original triangle winding. The palm and wrist are never cut.
 const edges=new Map();for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 const boundary=[...edges.values()];if(boundary.length){
  const center=V(),uv=[0,0];for(const [a] of boundary){center.add(V(...vertices.slice(a*3,a*3+3)));uv[0]+=sourceUV[a][0]/boundary.length;uv[1]+=sourceUV[a][1]/boundary.length;}center.divideScalar(boundary.length);const cap=vertices.length/3;vertices.push(...center.toArray());sourceUV.push(uv);for(const [a,b] of boundary)indices.push(b,a,cap);
 }
 let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(sourceUV.flat(),2));g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:vertices.length/3},(_,i)=>skinColor(sourceUV[i],vertices.slice(i*3,i*3+3))).flat(),3));g.setIndex(indices);
 g=refineSkin(T,g,2);
 const p=g.attributes.position;
 if(!open)for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);if(y>-.012&&y<.16&&r<.0141){p.setX(i,x*.0141/r);p.setZ(i,z*.0141/r);}}
 g.computeVertexNormals();
 const n=p.count,count=g.index.count,uvOffset=Math.ceil((16+n*21)/4)*4,indexOffset=uvOffset+n*8,bytes=new ArrayBuffer(indexOffset+count*4);
 new Uint32Array(bytes,0,4).set([0x32444846,n,count,1]);new Float32Array(bytes,16,n*3).set(p.array);
 new Int16Array(bytes,16+n*12,n*3).set(Int16Array.from(g.attributes.normal.array,v=>Math.round(T.MathUtils.clamp(v,-1,1)*32767)));
 new Uint8Array(bytes,16+n*18,n*3).set(Uint8Array.from(g.attributes.color.array,v=>Math.round(T.MathUtils.clamp(v,0,1)*255)));
 new Float32Array(bytes,uvOffset,n*2).set(g.attributes.uv.array);
 new Uint32Array(bytes,indexOffset,count).set(g.index.array);
 return {bytes:new Uint8Array(bytes),geometry:g,vertices:n,triangles:count/3,boundary:boundary.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)for(const [name,open] of [['grip',false],['open',true]]){const result=buildAnatomicalHand(open);await writeFile(new URL(`../assets/hand-anatomy-${name}.bin`,import.meta.url),result.bytes);console.log(name,{vertices:result.vertices,triangles:result.triangles,boundary:result.boundary,bytes:result.bytes.length});}
