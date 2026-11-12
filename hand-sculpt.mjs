// Metre-scale closed hand sculpt. Smooth unions keep the wrist and thumb web
// continuous; separate tapered finger paths preserve the interdigital gaps.
let cachedGrip=null,cachedOpen=null;
const bakedGeometries=new Map();
export async function prepareHands(THREE){
 await Promise.all(['grip','open'].map(async name=>{
  const response=await fetch(new URL(`./assets/hand-${name}.bin?v=6.8.0`,import.meta.url));if(!response.ok)throw new Error('手部模型加载失败');
  const data=await response.arrayBuffer(),header=new Uint32Array(data,0,2),n=header[0],count=header[1];let offset=8;
  const positions=new Float32Array(data,offset,n*3);offset+=n*12;
  const packedNormals=new Int16Array(data,offset,n*3);offset+=n*6;
  const packedColors=new Uint8Array(data,offset,n*3);offset+=n*3;offset=Math.ceil(offset/4)*4;
  const indices=new Uint32Array(data,offset,count),normals=Float32Array.from(packedNormals,v=>v/32767),colors=Float32Array.from(packedColors,v=>v/255),uv=new Float32Array(n*2);
  for(let i=0;i<n;i++){uv[i*2]=positions[i*3]*9;uv[i*2+1]=positions[i*3+1]*9;}
  const geo=new THREE.BufferGeometry();for(const [key,values,size] of [['position',positions,3],['normal',normals,3],['color',colors,3],['uv',uv,2]])geo.setAttribute(key,new THREE.BufferAttribute(values,size));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeBoundingSphere();bakedGeometries.set(name,geo);
 }));
}
export function sculptGrip(THREE,{open=false}={}){
 const cached=open?cachedOpen:cachedGrip;if(cached)return {...cached,mesh:cached.mesh.clone(),details:cached.details.map(m=>m.clone())};
 const V=(...p)=>new THREE.Vector3(...p),parts=[],fingerPaths=[];
 const ell=(c,r)=>parts.push({c,r,kind:'ell',pad:.004});
 const bone=(a,b,r0,r1,pad=.0025)=>{const d=b.map((v,i)=>v-a[i]);parts.push({a,b,d,l2:d.reduce((s,v)=>s+v*v,0),r0,r1,kind:'bone',pad});};
 ell([.066,.073,.001],[.045,.041,.022]);
 ell([.095,.047,.003],[.030,.027,.021]);
 ell([.052,.097,.012],[.025,.025,.012]);
 bone([.112,.039,.004],[.17,-.025,.022],.022,.028,.007);
 bone([.17,-.025,.022],[.286,-.169,.071],.028,.036,.008);
 bone([.286,-.169,.071],[.343,-.239,.084],.036,.039,.008);
 for(let f=0;f<4;f++){
  const y=[.116,.092,.069,.048][f],r=[.009,.0098,.0092,.0077][f],short=f===3?.008:0;
  const path=open?[[.042,y,-.014],[.008-short,y+.012,-.016],[-.02-short,y+.025,-.011],[-.046+short,y+.028,-.003]]:
   [[.04,y,-.017],[.004,y-.001,-.029],[-.022+short,y-.005,-.019],[-.027+short,y-.011,.006],[-.012+short,y-.014,.025]];
  fingerPaths.push(path);
  for(let i=0;i<path.length-1;i++)bone(path[i],path[i+1],r*(1-i*.065),r*(.94-i*.07),.0021);
  ell([.032,y,-.019],[.012,r*.98,r*.85]);
 }
 const thumb=open?[[.064,.095,.016],[.044,.133,.019],[.012,.154,.023],[-.012,.16,.027]]:
  [[.066,.088,.017],[.039,.112,.024],[.013,.116,.027],[-.006,.106,.027]];
 for(let i=0;i<3;i++)bone(thumb[i],thumb[i+1],[.0128,.0105,.0088][i],[.011,.0088,.0078][i],.004);
 for(const p of parts){const r=p.kind==='ell'?p.r:[Math.max(p.r0,p.r1),Math.max(p.r0,p.r1),Math.max(p.r0,p.r1)];p.lo=r.map((v,i)=>(p.c?p.c[i]:Math.min(p.a[i],p.b[i]))-v-.014);p.hi=r.map((v,i)=>(p.c?p.c[i]:Math.max(p.a[i],p.b[i]))+v+.014);}
 const smooth=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
 function field(x,y,z){
  let best=.025;
  for(const p of parts){
   if(x<p.lo[0]||x>p.hi[0]||y<p.lo[1]||y>p.hi[1]||z<p.lo[2]||z>p.hi[2])continue;
   let d;if(p.kind==='ell'){
    const px=x-p.c[0],py=y-p.c[1],pz=z-p.c[2],rx=p.r[0],ry=p.r[1],rz=p.r[2];
    const k0=Math.hypot(px/rx,py/ry,pz/rz),k1=Math.hypot(px/(rx*rx),py/(ry*ry),pz/(rz*rz));d=k0*(k0-1)/(k1||1);
   }else{
    const px=x-p.a[0],py=y-p.a[1],pz=z-p.a[2],t=Math.max(0,Math.min(1,(px*p.d[0]+py*p.d[1]+pz*p.d[2])/p.l2));
    d=Math.hypot(px-t*p.d[0],py-t*p.d[1],pz-t*p.d[2])-(p.r0+(p.r1-p.r0)*t);
   }best=smooth(best,d,p.pad);
  }
  if(!open&&y>-.012&&y<.162)best=Math.max(best,.0133-Math.hypot(x,z));
  return best;
 }
 let geo=bakedGeometries.get(open?'open':'grip');
 if(!geo){
 const step=.003,min=[-.065,-.285,-.062],max=[.39,.185,.142],dims=max.map((v,i)=>Math.ceil((v-min[i])/step)+1),[nx,ny,nz]=dims;
 const grid=new Float32Array(nx*ny*nz),at=(x,y,z)=>(z*ny+y)*nx+x;
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)grid[at(x,y,z)]=field(min[0]+x*step,min[1]+y*step,min[2]+z*step);
 const ps=[],ids=[],edgeMap=new Map(),offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const pos=id=>{const x=id%nx,y=Math.floor(id/nx)%ny,z=Math.floor(id/(nx*ny));return [min[0]+x*step,min[1]+y*step,min[2]+z*step];};
 function crossEdge(a,b){const key=a<b?`${a}:${b}`:`${b}:${a}`;if(edgeMap.has(key))return edgeMap.get(key);const pa=pos(a),pb=pos(b),t=grid[a]/(grid[a]-grid[b]),id=ps.length/3;ps.push(...pa.map((n,i)=>n+(pb[i]-n)*t));edgeMap.set(key,id);return id;}
 function triangle(a,b,c){
  const va=V(...ps.slice(a*3,a*3+3)),vb=V(...ps.slice(b*3,b*3+3)),vc=V(...ps.slice(c*3,c*3+3)),n=vb.clone().sub(va).cross(vc.clone().sub(va)).normalize(),m=va.add(vb).add(vc).multiplyScalar(1/3);
  const e=.0004;ids.push(a,...(field(m.x+n.x*e,m.y+n.y*e,m.z+n.z*e)>=field(m.x-n.x*e,m.y-n.y*e,m.z-n.z*e)?[b,c]:[c,b]));
 }
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const cube=offsets.map(o=>at(x+o[0],y+o[1],z+o[2]));if(cube.every(i=>grid[i]>0)||cube.every(i=>grid[i]<=0))continue;
  for(const t of tets){const a=t.map(k=>cube[k]),ins=a.filter(i=>grid[i]<=0),out=a.filter(i=>grid[i]>0);if(!ins.length||!out.length)continue;
   if(ins.length===1||out.length===1){const one=(ins.length===1?ins:out)[0],others=ins.length===1?out:ins;triangle(...others.map(i=>crossEdge(one,i)));}
   else {const a=crossEdge(ins[0],out[0]),b=crossEdge(ins[0],out[1]),c=crossEdge(ins[1],out[0]),d=crossEdge(ins[1],out[1]);triangle(a,b,c);triangle(b,d,c);}
  }
 }
 const colors=[],uv=[];
 for(let i=0;i<ps.length;i+=3){const [x,y,z]=ps.slice(i,i+3),warm=Math.max(0,1-Math.abs(x+.018)/.025)*Math.max(0,1-Math.abs(y-.08)/.07),noise=Math.sin(x*2311+y*1777+z*2999)*.006;
  colors.push(.59+warm*.025+noise,.365-warm*.012+noise,.245-warm*.012+noise);uv.push(x*9,y*9);
 }
 const normals=[],epsilon=.0003;
 for(let i=0;i<ps.length;i+=3){const [x,y,z]=ps.slice(i,i+3),n=V(field(x+epsilon,y,z)-field(x-epsilon,y,z),field(x,y+epsilon,z)-field(x,y-epsilon,z),field(x,y,z+epsilon)-field(x,y,z-epsilon)).normalize();normals.push(n.x,n.y,n.z);}
 geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeBoundingSphere();
 }
 const texels=new Uint8Array(128*128);for(let i=0;i<texels.length;i++)texels[i]=Math.round(127+Math.sin(i*12.9898)*Math.cos(i*4.14)*30);
 const grain=new THREE.DataTexture(texels,128,128,THREE.RedFormat);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;
 const skin=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.62,bumpMap:grain,bumpScale:.00012,clearcoat:.018,sheen:.12,sheenColor:'#c59378'}),mesh=new THREE.Mesh(geo,skin);mesh.name='Continuous forearm';mesh.userData={handSurface:'Closed five-finger anatomical sculpt',closedSurface:true,fingerCount:5,minimumSkinRadius:open?0:.0133};
 const details=[],nailMat=new THREE.MeshPhysicalMaterial({color:'#cca48f',roughness:.43,clearcoat:.12,clearcoatRoughness:.4});
 for(const [i,path] of [...fingerPaths,thumb].entries()){
  const end=V(...path.at(-1)),previous=V(...path.at(-2)),direction=end.clone().sub(previous).normalize();
  const nail=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),nailMat);nail.name=['Index','Middle','Ring','Little','Thumb'][i]+' nail';
  nail.scale.set(i===3?.0035:.0043,i===4?.0055:.0048,.0005);
  const normal=i===4?V(0,.35,1).normalize():open?V(0,0,-1):V(-.75,0,.66);normal.addScaledVector(direction,-normal.dot(direction)).normalize();
  const width=direction.clone().cross(normal).normalize();nail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(width,direction,normal));
  const base=end.clone().addScaledVector(direction,-.004);let lo=0,hi=.022;for(let j=0;j<18;j++){const t=(lo+hi)/2,p=base.clone().addScaledVector(normal,t);if(field(p.x,p.y,p.z)<0)lo=t;else hi=t;}
  nail.position.copy(base).addScaledVector(normal,(lo+hi)/2+.00008);details.push(nail);
 }
 const result={mesh,details,fingerPaths,thumb};if(open)cachedOpen=result;else cachedGrip=result;return result;
}
