// Follow the actual garment opening, including its higher side edges and
// lower front. Weld UV duplicates before finding boundaries so a texture seam
// cannot become a second collar or a stripe down the back.
export function necklineDistances(positions,indices){
 const welded=new Map(),ids=new Map(),edges=new Map();
 for(const id of indices){
  const key=[0,1,2].map(k=>positions[id*3+k].toFixed(5)).join(',');
  if(!welded.has(key))welded.set(key,id);ids.set(id,welded.get(key));
 }
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
  const a=ids.get(indices[i+j]),b=ids.get(indices[i+(j+1)%3]);if(a===b)continue;
  const key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);
 }
 const segments=[];
 for(const [key,count] of edges)if(count===1){
  const ids=key.split(':').map(Number);
  if(ids.some(id=>positions[id*3+1]<1.49||Math.abs(positions[id*3])>.115))continue;
  segments.push(ids.map(id=>Array.from(positions.slice(id*3,id*3+3))));
 }
 const distances=new Float32Array(positions.length/3).fill(1);
 for(const id of new Set(indices)){
  const p=Array.from(positions.slice(id*3,id*3+3));if(p[1]<1.46||Math.abs(p[0])>.15)continue;
  for(const [a,b] of segments){
   const d=b.map((x,k)=>x-a[k]),v=p.map((x,k)=>x-a[k]);
   const length=d.reduce((s,x)=>s+x*x,0),t=Math.max(0,Math.min(1,d.reduce((s,x,k)=>s+x*v[k],0)/Math.max(length,1e-12)));
   distances[id]=Math.min(distances[id],Math.hypot(...v.map((x,k)=>x-t*d[k])));
  }
 }
 return {distances,segments};
}
