// Build a compact, attributed game asset from MakeHuman's CC0 data, not its code.
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
const input=path.resolve('../../work/assets/makehuman');
const output=path.resolve('assets');
const vertices=[],uvs=[],faces=[];let group='';
for(const line of (await readFile(path.join(input,'base.obj'),'utf8')).split('\n')){
  const parts=line.trim().split(/\s+/);
  if(parts[0]==='v')vertices.push(parts.slice(1).map(Number));
  if(parts[0]==='vt')uvs.push(parts.slice(1).map(Number));
  if(parts[0]==='g')group=parts[1];
  if(parts[0]==='f'&&group==='body')faces.push(parts.slice(1).map(p=>p.split('/').map(v=>Number(v)-1)));
}
for(const [name,factor] of [['asian-male-young.target',1],['universal-male-young-maxmuscle-averageweight.target',.75]]){
  for(const line of (await readFile(path.join(input,name),'utf8')).split('\n')){
    const values=line.trim().split(/\s+/).map(Number);
    if(values.length===4&&values.every(Number.isFinite))for(let k=0;k<3;k++)vertices[values[0]][k]+=values[k+1]*factor;
  }
}
const used=[...new Set(faces.flat().map(p=>p[0]))];
const minY=Math.min(...used.map(i=>vertices[i][1])),maxY=Math.max(...used.map(i=>vertices[i][1]));
const scale=1.81/(maxY-minY);
const point=p=>p.map((v,k)=>(v-(k===1?minY:0))*scale);
const rig=JSON.parse(await readFile(path.join(input,'default.mhskel'),'utf8'));
const weights=JSON.parse(await readFile(path.join(input,'default_weights.mhw'),'utf8')).weights;
const keep=new Set(['root','spine05','spine03','spine01','neck01','head']);
for(const s of ['L','R'])for(const n of ['upperarm01','lowerarm01','wrist','upperleg01','lowerleg01','foot',...Array.from({length:5},(_,i)=>Array.from({length:3},(_,j)=>'finger'+(i+1)+'-'+(j+1))).flat()])keep.add(n+'.'+s);
const remap=name=>{while(name&&!keep.has(name))name=rig.bones[name]?.parent;return name||'root';};
const bones=[];
function addBone(name){if(bones.some(b=>b.name===name))return;const source=rig.bones[name];if(!source)return;const parent=source.parent?remap(source.parent):null;if(parent&&parent!==name)addBone(parent);const indices=rig.joints[source.head];const center=indices.reduce((p,i)=>p.map((v,k)=>v+vertices[i][k]/indices.length),[0,0,0]);bones.push({name,parent,position:point(center)});}
for(const name of keep)addBone(name);
const lookup=new Map(bones.map((b,i)=>[b.name,i]));
const vertexWeights=vertices.map(()=>new Map());
for(const [name,entries] of Object.entries(weights))for(const [i,w] of entries){const target=lookup.get(remap(name));vertexWeights[i].set(target,(vertexWeights[i].get(target)||0)+w);}
const positions=[],texcoords=[],skinIndex=[],skinWeight=[],original=[],indices=[];
const map=new Map();
function indexFor([v,t]){
 const key=v+'/'+t;if(map.has(key))return map.get(key);
 const index=positions.length/3;map.set(key,index);original.push(v);positions.push(...point(vertices[v]));texcoords.push(...uvs[t]);
 const list=[...vertexWeights[v]].sort((a,b)=>b[1]-a[1]).slice(0,4);const sum=list.reduce((s,p)=>s+p[1],0)||1;
 for(let i=0;i<4;i++){skinIndex.push(list[i]?.[0]||0);skinWeight.push((list[i]?.[1]||0)/sum);}return index;
}
for(const face of faces)for(let i=1;i<face.length-1;i++)indices.push(indexFor(face[0]),indexFor(face[i]),indexFor(face[i+1]));
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
const normals=g.attributes.normal;const color=[],armWeights=[];
for(let i=0;i<positions.length/3;i++){
 const [x,y,z]=positions.slice(i*3,i*3+3),ax=Math.abs(x);
 const weightsFor=[...vertexWeights[original[i]]];
 const armWeight=weightsFor.reduce((sum,[j,w])=>sum+(/upperarm|lowerarm|wrist|finger/.test(bones[j].name)?w:0),0);
 armWeights.push(armWeight);
 // Subtle vertex skin pigment around lips, eye sockets, ears and facial hair.
 const c=new THREE.Color('#c2957d');const noise=Math.sin(i*12.9898)*.5+.5;c.offsetHSL(0,(noise-.5)*.016,(noise-.5)*.012);
 if(y>1.60&&z>.105){
   const lip=Math.exp(-Math.pow((y-1.623)/.006,2)-Math.pow(x/.026,4));c.lerp(new THREE.Color('#955e58'),lip*.7);
   const stubble=Math.max(0,1-Math.abs(y-1.61)/.04)*Math.max(0,1-Math.abs(x)/.08);c.lerp(new THREE.Color('#716052'),stubble*.12);
   const socket=Math.exp(-Math.pow((y-1.691)/.016,2)-Math.pow((ax-.033)/.024,2));c.lerp(new THREE.Color('#a57c6a'),socket*.28);
 }
 color.push(c.r,c.g,c.b);
}
// Clip triangle edges at garment hems. This avoids saw-tooth material borders.
const sourceVertices=Array.from({length:positions.length/3},(_,i)=>({p:positions.slice(i*3,i*3+3),uv:texcoords.slice(i*2,i*2+2),c:color.slice(i*3,i*3+3),n:Array.from(normals.array.slice(i*3,i*3+3)),weights:new Map(skinIndex.slice(i*4,i*4+4).map((j,k)=>[j,skinWeight[i*4+k]])),arm:armWeights[i]}));
positions.length=texcoords.length=color.length=skinIndex.length=skinWeight.length=0;
const normalOutput=[],groups=Array.from({length:5},()=>[]),outputMap=new Map();
function blend(a,b,t){const mix=(x,y)=>x.map((v,k)=>v+(y[k]-v)*t),weights=new Map();for(const [j,w] of a.weights)weights.set(j,w*(1-t));for(const [j,w] of b.weights)weights.set(j,(weights.get(j)||0)+w*t);return {p:mix(a.p,b.p),uv:mix(a.uv,b.uv),c:mix(a.c,b.c),n:mix(a.n,b.n),arm:a.arm+(b.arm-a.arm)*t,weights};}
function clip(poly,metric,inside){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=metric(a),db=metric(b),keepA=inside?da>=0:da<0,keepB=inside?db>=0:db<0;if(keepA)out.push(a);if(keepA!==keepB)out.push(blend(a,b,da/(da-db)));}return out;}
function append(v,zone){const key=zone+'/'+v.p.map(x=>x.toFixed(6)).join(',')+'/'+v.uv.map(x=>x.toFixed(5)).join(',');if(outputMap.has(key))return outputMap.get(key);const index=positions.length/3;outputMap.set(key,index);const p=[...v.p],n=new THREE.Vector3(...v.n).normalize();if(zone===1||zone===2){const puff=(zone===1?.009:.014)+(Math.sin(p[1]*110+p[0]*37)+Math.sin(p[0]*58+p[1]*21))*.0013;for(let k=0;k<3;k++)p[k]+=n.getComponent(k)*puff;}positions.push(...p);texcoords.push(...v.uv);color.push(...v.c);normalOutput.push(n.x,n.y,n.z);const list=[...v.weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,a)=>s+a[1],0)||1;for(let k=0;k<4;k++){skinIndex.push(list[k]?.[0]||0);skinWeight.push((list[k]?.[1]||0)/sum);}return index;}
const cuts=[
 [1,v=>{const [x,y]=v.p,ax=Math.abs(x);return Math.min(y-.982,1.53-y,Math.max(1.495-y,ax-.077),Math.max(.215-ax,Math.min(v.arm-.25,y-1.305)));}],
 [2,v=>Math.min(v.p[1]-.635,.99-v.p[1],.34-Math.abs(v.p[0]))],
 [3,v=>Math.min(v.p[1]-.105,.245-v.p[1])],
 [4,v=>.105-v.p[1]],
];
function emit(poly,zone){if(poly.length<3)return;for(let j=1;j<poly.length-1;j++)groups[zone].push(append(poly[0],zone),append(poly[j],zone),append(poly[j+1],zone));}
for(let i=0;i<indices.length;i+=3){let polygon=indices.slice(i,i+3).map(j=>sourceVertices[j]);for(const [zone,metric] of cuts){if(!polygon.length)break;emit(clip(polygon,metric,true),zone);polygon=clip(polygon,metric,false);}emit(polygon,0);}
if(positions.length/3>=65536)throw Error('Asset exceeds uint16 vertex limit');
const pack=(data,Type)=>Buffer.from(new Type(data).buffer).toString('base64');
let source='// MakeHuman CC0 mesh, morphed and packed for Feather Court. See THIRD-PARTY.md.\n';
source+='const decode=(text,Type)=>{const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);};\n';
for(const [name,data,Type] of [['positions',positions,Float32Array],['normals',normalOutput,Float32Array],['uvs',texcoords,Float32Array],['colors',color,Float32Array],['skinIndex',skinIndex,Uint16Array],['skinWeight',skinWeight,Float32Array],...groups.map((g,i)=>['indices'+i,g,Uint16Array])])source+='export const '+name+'=decode('+JSON.stringify(pack(data,Type))+','+Type.name+');\n';
source+='export const bones='+JSON.stringify(bones)+';\n';
await mkdir(output,{recursive:true});await writeFile(path.join(output,'athlete-data.mjs'),source);
await copyFile(path.join(input,'LICENSE.ASSETS.md'),path.join(output,'MAKEHUMAN-CC0.md'));
console.log({vertices:positions.length/3,triangles:indices.length/3,bones:bones.length,height:1.81,bytes:source.length,groups:groups.map(g=>g.length/3)});
