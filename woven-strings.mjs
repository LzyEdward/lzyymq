// A 0.66 mm string bed: alternate over/under crossings and lightable surface.
// Only the near racket needs this geometry; distant rackets use coverage lines.
export const STRING_RADIUS=.00033;
export const STRING_PITCH=.0083;
export const STRING_CROSS_PITCH=.012;
export function stringCrossing(axis,index,along){
 const phase=axis==='vertical'?(along-.51)/STRING_CROSS_PITCH+10:along/STRING_PITCH+10.5;
 return (axis==='vertical'?1:-1)*.00035*Math.cos(Math.PI*(phase+index));
}
export function createWovenStrings(T,{stencil=()=>false}={}){
 const buckets=[{positions:[],normals:[],indices:[]},{positions:[],normals:[],indices:[]}];
 const V=(...p)=>new T.Vector3(...p),inside=(x,y)=>Math.abs(x/.098)**2.3+Math.abs((y-.51)/.139)**2.3<=1;
 function segment(a,b){
  const mid=a.clone().add(b).multiplyScalar(.5),bucket=buckets[stencil(mid.x,mid.y)?1:0],axis=b.clone().sub(a).normalize();
  const side=V(-axis.y,axis.x,0).normalize(),front=axis.clone().cross(side).normalize(),offset=bucket.positions.length/3;
  for(const p of [a,b])for(let k=0;k<4;k++){
   const angle=k*Math.PI/2+Math.PI/4,normal=side.clone().multiplyScalar(Math.cos(angle)).addScaledVector(front,Math.sin(angle));
   bucket.positions.push(...p.clone().addScaledVector(normal,STRING_RADIUS).toArray());bucket.normals.push(...normal.toArray());
  }
  for(let k=0;k<4;k++){const next=(k+1)%4;bucket.indices.push(offset+k,offset+next,offset+k+4,offset+next,offset+next+4,offset+k+4);}
 }
 for(const axis of ['vertical','horizontal'])for(let index=0;index<(axis==='vertical'?22:21);index++){
  const start=axis==='vertical'?.365:-.105,end=axis==='vertical'?.655:.105,steps=Math.ceil((end-start)/((axis==='vertical'?STRING_CROSS_PITCH:STRING_PITCH)/2));
  for(let k=0;k<steps;k++){
   let lo=start+(end-start)*k/steps,hi=start+(end-start)*(k+1)/steps;
   const point=t=>axis==='vertical'?V((index-10.5)*STRING_PITCH,t,stringCrossing(axis,index,t)):V(t,.51+(index-10)*STRING_CROSS_PITCH,stringCrossing(axis,index,t));
   let a=point(lo),b=point(hi),ia=inside(a.x,a.y),ib=inside(b.x,b.y);if(!ia&&!ib)continue;
   if(ia!==ib){let l=lo,h=hi;for(let n=0;n<14;n++){const m=(l+h)/2,p=point(m);if(inside(p.x,p.y)===ia)l=m;else h=m;}if(ia)b=point((l+h)/2);else a=point((l+h)/2);}
   segment(a,b);
  }
 }
 const group=new T.Group();
 for(const [i,b] of buckets.entries()){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));g.setIndex(b.indices);g.computeBoundingSphere();
  const m=new T.MeshStandardMaterial({color:i?'#b52e28':'#d9ddd3',roughness:.48,metalness:0});
  const mesh=new T.Mesh(g,m);mesh.name=i?'Yonex string stencil':'Woven white strings';mesh.castShadow=false;group.add(mesh);
 }
 group.name='Physical woven string bed';group.userData={radius:STRING_RADIUS,pitch:STRING_PITCH,mains:22,crosses:21,drawCalls:2};return group;
}
