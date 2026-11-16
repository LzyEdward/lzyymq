import * as T from 'three';
import * as source from '../assets/athlete-data.mjs';
import {refineSkin} from '../skin-surface.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const ARM_BONES=source.bones.filter(b=>/^(?:upperarm01|lowerarm01|wrist|finger\d-\d)\.R$/.test(b.name)).map(b=>b.name);
export function buildPlayerArm(){
 const ids=new Map(ARM_BONES.map((name,i)=>[name,i])),points=[],indices=[],cornerUV=[],groups=[],lookup=new Map();
 const vertex=(id,cloth=false)=>{
  const weights=new Map();for(let k=0;k<4;k++){const i=source.skinIndex[id*4+k],w=source.skinWeight[id*4+k],j=ids.get(source.bones[i]?.name);if(w>0)weights.set(j??0,(weights.get(j??0)||0)+w);}
  const stored=Array.from(source.positions.slice(id*3,id*3+3)),p=[...stored];
  if(cloth){const normal=Array.from(source.normals.slice(id*3,id*3+3));for(let n=0;n<5;n++){const puff=.009+(Math.sin(p[1]*110+p[0]*37)+Math.sin(p[0]*58+p[1]*21))*.0013;for(let k=0;k<3;k++)p[k]=stored[k]-normal[k]*puff;}}
  return {p,c:Array.from(source.colors.slice(id*3,id*3+3)),uv:Array.from(source.uvs.slice(id*2,id*2+2)),weights};
 };
 const mix=(a,b,t)=>{const weights=new Map();for(const [j,w] of a.weights)weights.set(j,w*(1-t));for(const [j,w] of b.weights)weights.set(j,(weights.get(j)||0)+w*t);return {...Object.fromEntries(['p','c','uv'].map(key=>[key,a[key].map((v,i)=>v+(b[key][i]-v)*t)])),weights};};
 const append=v=>{
  const cell=v.p.map(x=>Math.floor(x/1e-5));
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of lookup.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))||[]){if(Math.hypot(...v.p.map((n,k)=>n-points[id].p[k]))<2e-6)return id;}
  const id=points.length,key=cell.join(',');points.push(v);if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push(id);return id;
 };
 for(const [materialIndex,faces] of [source.indices0,source.indices1].entries()){
  const start=indices.length;
  for(let i=0;i<faces.length;i+=3){
   const sourceIds=Array.from(faces.slice(i,i+3));let armWeight=0;
   for(const id of sourceIds)for(let k=0;k<4;k++)if(ids.has(source.bones[source.skinIndex[id*4+k]]?.name))armWeight+=source.skinWeight[id*4+k]/3;
   if(armWeight<.005)continue;
   let polygon=sourceIds.map(id=>vertex(id,materialIndex===1));
   for(const [axis,limit,sign] of [[0,-.205,-1],[1,.93,1]]){
    const clipped=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],da=(a.p[axis]-limit)*sign,db=(b.p[axis]-limit)*sign;if(da>=0)clipped.push(a);if((da>=0)!==(db>=0))clipped.push(mix(a,b,da/(da-db)));}polygon=clipped;
   }
   for(let j=1;j<polygon.length-1;j++)for(const point of [polygon[0],polygon[j],polygon[j+1]]){indices.push(append(point));cornerUV.push(...point.uv);}
  }
  groups.push({start,count:indices.length-start,materialIndex});
 }
 // Cap only the hidden shoulder crop; the wrist and elbow are never cut.
 const edges=new Map();for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 if(edges.size){
  const boundary=[...edges.values()],center={p:[0,0,0],c:[0,0,0],uv:[0,0],weights:new Map([[0,1]])};
  for(const [a] of boundary)for(const key of ['p','c','uv'])for(let k=0;k<center[key].length;k++)center[key][k]+=points[a][key][k]/boundary.length;
  const cap=points.length;points.push(center);const start=indices.length;for(const [a,b] of boundary){indices.push(b,a,cap);cornerUV.push(...points[b].uv,...points[a].uv,...center.uv);}groups.push({start,count:indices.length-start,materialIndex:1});
 }
 const geometry=new T.BufferGeometry(),boneIds=[],weights=[];
 for(const p of points){const list=[...p.weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,[,w])=>s+w,0);for(let k=0;k<4;k++){boneIds.push(list[k]?.[0]||0);weights.push((list[k]?.[1]||0)/sum);}}
 for(const [name,array,size] of [['position',points.flatMap(p=>p.p),3],['color',points.flatMap(p=>p.c),3],['uv',points.flatMap(p=>p.uv),2],['skinWeight',weights,4]])geometry.setAttribute(name,new T.Float32BufferAttribute(array,size));
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(boneIds,4));geometry.setIndex(indices);for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
 geometry.userData.cornerUV=cornerUV;
 const refined=refineSkin(T,geometry,2),n=refined.attributes.position.count,count=refined.index.count;
 const streams=[['position',Float32Array,3],['normal',Int16Array,3],['color',Uint8Array,3],['uv',Float32Array,2],['skinIndex',Uint16Array,4],['skinWeight',Uint16Array,4]];
 let offset=24;const layout=streams.map(([name,Type,size])=>{offset=Math.ceil(offset/Type.BYTES_PER_ELEMENT)*Type.BYTES_PER_ELEMENT;const at=offset;offset+=n*size*Type.BYTES_PER_ELEMENT;return {name,Type,size,at};});offset=Math.ceil(offset/4)*4;const indexOffset=offset;offset+=count*4;
 const groupOffset=offset;offset+=refined.groups.length*12;const buffer=new ArrayBuffer(offset);new Uint32Array(buffer,0,6).set([0x314d5241,n,count,refined.groups.length,ARM_BONES.length,0]);
 for(const {name,Type,size,at} of layout){let values=refined.attributes[name].array;if(name==='normal')values=Int16Array.from(values,v=>Math.round(T.MathUtils.clamp(v,-1,1)*32767));if(name==='color')values=Uint8Array.from(values,v=>Math.round(T.MathUtils.clamp(v,0,1)*255));if(name==='skinWeight')values=Uint16Array.from(values,v=>Math.round(T.MathUtils.clamp(v,0,1)*65535));new Type(buffer,at,n*size).set(values);}
 new Uint32Array(buffer,indexOffset,count).set(refined.index.array);new Uint32Array(buffer,groupOffset,refined.groups.length*3).set(refined.groups.flatMap(g=>[g.start,g.count,g.materialIndex]));
 const boundaryBounds=[0,1,2].map(k=>{const values=[...edges.values()].flatMap(([a,b])=>[points[a].p[k],points[b].p[k]]);return [Math.min(...values),Math.max(...values)];});
 return {bytes:new Uint8Array(buffer),geometry:refined,bones:ARM_BONES,vertices:n,triangles:count/3,sourceBoundary:edges.size,boundaryBounds};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=buildPlayerArm();await writeFile(new URL('../assets/player-arm.bin',import.meta.url),result.bytes);console.log({vertices:result.vertices,triangles:result.triangles,bones:result.bones.length,bytes:result.bytes.length,sourceBoundary:result.sourceBoundary});}
