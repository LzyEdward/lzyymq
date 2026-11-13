// Loop subdivision preserves connected skin and rounds the original anatomical
// topology. It never punches holes in the palm to make room for an object.
export function refineSkin(THREE, geometry, levels=2) {
 let points=Array.from({length:geometry.attributes.position.count},(_,i)=>{
  const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);
  const c=new THREE.Vector3().fromBufferAttribute(geometry.attributes.color,i);
  const uv=new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv,i);
  const weights=new Map();
  if(geometry.attributes.skinIndex)for(let k=0;k<4;k++){const id=geometry.attributes.skinIndex.array[i*4+k],weight=geometry.attributes.skinWeight.array[i*4+k];weights.set(id,(weights.get(id)||0)+weight);}
  return {p,c,uv,weights};
 });
 let triangles=Array.from(geometry.index.array);
 for(let level=0;level<levels;level++){
  const edges=new Map(),neighbors=points.map(()=>new Set()),boundary=points.map(()=>new Set());
  for(let i=0;i<triangles.length;i+=3)for(let j=0;j<3;j++){
   const a=triangles[i+j],b=triangles[i+(j+1)%3],other=triangles[i+(j+2)%3],key=a<b?`${a},${b}`:`${b},${a}`;
   if(!edges.has(key))edges.set(key,{a,b,opposite:[]});edges.get(key).opposite.push(other);neighbors[a].add(b);neighbors[b].add(a);
  }
  for(const edge of edges.values())if(edge.opposite.length===1){boundary[edge.a].add(edge.b);boundary[edge.b].add(edge.a);}
  const next=points.map((v,i)=>{
   const adjacent=neighbors[i],rim=[...boundary[i]],p=v.p.clone();
   if(rim.length===2)p.multiplyScalar(.75).addScaledVector(points[rim[0]].p,.125).addScaledVector(points[rim[1]].p,.125);
   else if(rim.length===0&&adjacent.size){const n=adjacent.size,beta=n===3?3/16:3/(8*n);p.multiplyScalar(1-n*beta);for(const k of adjacent)p.addScaledVector(points[k].p,beta);}
   return {...v,p};
  });
  for(const edge of edges.values()){
   const {a,b,opposite}=edge,p=points[a].p.clone().add(points[b].p);
   if(opposite.length===2)p.multiplyScalar(3/8).addScaledVector(points[opposite[0]].p,1/8).addScaledVector(points[opposite[1]].p,1/8);else p.multiplyScalar(.5);
   const weights=new Map();for(const point of [points[a],points[b]])for(const [bone,weight] of point.weights)weights.set(bone,(weights.get(bone)||0)+weight*.5);
   edge.index=next.length;next.push({p,c:points[a].c.clone().lerp(points[b].c,.5),uv:points[a].uv.clone().lerp(points[b].uv,.5),weights});
  }
  const edgeIndex=(a,b)=>edges.get(a<b?`${a},${b}`:`${b},${a}`).index,newTriangles=[];
  for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3),ab=edgeIndex(a,b),bc=edgeIndex(b,c),ca=edgeIndex(c,a);newTriangles.push(a,ab,ca,b,bc,ab,c,ca,bc,ab,bc,ca);}
  points=next;triangles=newTriangles;
 }
 const out=new THREE.BufferGeometry();
 out.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(v=>v.p.toArray()),3));
 out.setAttribute('color',new THREE.Float32BufferAttribute(points.flatMap(v=>v.c.toArray()),3));
 out.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(v=>v.uv.toArray()),2));
 if(geometry.attributes.skinIndex){
  const ids=[],weights=[];
  for(const point of points){const list=[...point.weights].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,[,w])=>s+w,0);for(let i=0;i<4;i++){ids.push(list[i]?.[0]||0);weights.push((list[i]?.[1]||0)/Math.max(sum,1e-9));}}
  out.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));out.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 }
 for(const group of geometry.groups)out.addGroup(group.start*4**levels,group.count*4**levels,group.materialIndex);
 out.setIndex(triangles);out.computeVertexNormals();out.computeBoundingSphere();return out;
}
