// Metre-scale closed hand sculpt. Smooth unions keep the wrist and thumb web
// continuous; separate tapered finger paths preserve the interdigital gaps.
import {boundedAsset,handBufferLayout} from './asset-loading.mjs?v=7.1.0';
import {handTint,handUV,createHandSkin} from './hand-surface.mjs?v=7.1.0';
import {handPaths} from './hand-pose.mjs?v=7.1.0';
let cachedGrip=null,cachedOpen=null,runtimeFallback=false;
const bakedGeometries=new Map();
export async function prepareHands(THREE,{safe=false,onWarning=()=>{}}={}){
 runtimeFallback=true;
 if(safe)return;
 await Promise.all(['grip','open'].map(async name=>{
  const data=await boundedAsset(async signal=>{
   const response=await fetch(new URL(`./assets/hand-${name}.bin?v=7.1.0`,import.meta.url),{signal});if(!response.ok)throw new Error(`手部模型 HTTP ${response.status}`);
   const bytes=await response.arrayBuffer();handBufferLayout(bytes);return bytes;
  },{timeout:10000,label:`${name}手部模型`,onWarning});
  if(!data)return;
  const {vertices:n,indices:count}=handBufferLayout(data);let offset=8;
  const positions=new Float32Array(data,offset,n*3);offset+=n*12;
  const packedNormals=new Int16Array(data,offset,n*3);offset+=n*6;
  const packedColors=new Uint8Array(data,offset,n*3);offset+=n*3;offset=Math.ceil(offset/4)*4;
  const indices=new Uint32Array(data,offset,count),normals=Float32Array.from(packedNormals,v=>v/32767),colors=Float32Array.from(packedColors,v=>v/255),uv=new Float32Array(n*2);
  for(let i=0;i<n;i++){const pair=handUV(positions[i*3],positions[i*3+1]);uv[i*2]=pair[0];uv[i*2+1]=pair[1];}
  const geo=new THREE.BufferGeometry();for(const [key,values,size] of [['position',positions,3],['normal',normals,3],['color',colors,3],['uv',uv,2]])geo.setAttribute(key,new THREE.BufferAttribute(values,size));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeBoundingSphere();geo.userData.anatomical=true;bakedGeometries.set(name,geo);
 }));
}
export function sculptGrip(THREE,{open=false}={}){
 const cached=open?cachedOpen:cachedGrip;if(cached)return {...cached,mesh:cached.mesh.clone(),details:cached.details.map(m=>m.clone())};
 const V=(...p)=>new THREE.Vector3(...p),parts=[],fingerPaths=[];
 const ell=(c,r)=>parts.push({c,r,kind:'ell',pad:.004});
 const bone=(a,b,r0,r1,pad=.0025)=>{const d=b.map((v,i)=>v-a[i]);parts.push({a,b,d,l2:d.reduce((s,v)=>s+v*v,0),r0,r1,kind:'bone',pad});};
 ell([.063,.073,-.001],[.038,.035,.016]);
 ell([.089,.047,.001],[.026,.024,.015]);
 ell([.054,.092,.010],[.019,.018,.008]);
 bone([.109,.038,.003],[.17,-.025,.022],.018,.026,.005);
 bone([.17,-.025,.022],[.286,-.169,.071],.028,.036,.008);
 bone([.286,-.169,.071],[.343,-.239,.084],.036,.039,.008);
 for(let f=0;f<4;f++){
  const y=[.116,.092,.069,.048][f],r=[.0085,.0093,.0087,.0074][f],short=f===3?.008:0;
  const path=open?[[.042,y,-.014],[.008-short,y+.012,-.016],[-.02-short,y+.025,-.011],[-.046+short,y+.028,-.003]]:
   [[.04,y,-.017],[.004,y-.001,-.029],[-.022+short,y-.005,-.019],[-.027+short,y-.011,.006],[-.012+short,y-.014,.025]];
  fingerPaths.push(path);
  for(let i=0;i<path.length-1;i++)bone(path[i],path[i+1],r*(1-i*.065),r*(.94-i*.07),.002);
  ell([.032,y,-.019],[.0115,r*.98,r*.85]);
  for(let i=1;i<path.length-1;i++){const p=path[i];ell([p[0],p[1],p[2]],[r*(i===1?1.06:.94),r*.96,r*(i===1?1.04:.92)]);}
 }
 const thumb=open?[[.062,.092,.014],[.043,.132,.018],[.012,.154,.023],[-.012,.16,.027]]:
  [[.061,.085,.014],[.036,.108,.022],[.011,.113,.026],[-.006,.105,.026]];
 for(let i=0;i<3;i++)bone(thumb[i],thumb[i+1],[.0102,.0088,.0078][i],[.0091,.0078,.0068][i],.0025);
 // The metacarpals are broad at the finger roots and converge toward the
 // wrist. Their shallow dorsal ridges interrupt the former balloon palm.
 for(let f=0;f<4;f++)bone([.039,[.115,.092,.069,.049][f],-.018],[.096,.049+f*.002,-.011],.0025,.0014,.001);
 const joints=[...fingerPaths.map(path=>path.slice(1,-1)),thumb.slice(1,-1)].flat();
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
  // Sub-millimetre folds follow the actual joints, with a restricted side
  // mask so fingers don't acquire artificial full-ring seams.
  if(y>.025&&x<.072){
   for(const p of joints){const dy=y-p[1],dx=x-p[0],dz=z-p[2];
    if(Math.abs(dy)<.012&&Math.abs(dx)<.007&&Math.abs(dz)<.018){const exposed=Math.max(0,Math.min(1,(-z+.004)*90));best+=.00042*Math.exp(-dx*dx/.0000016-dy*dy/.000065)*exposed;}
   }
  }
  if(!open&&y>-.012&&y<.162)best=Math.max(best,.0133-Math.hypot(x,z));
  return best;
 }
 let geo=bakedGeometries.get(open?'open':'grip');
 if(!geo){
 const step=runtimeFallback?.006:.003,min=[-.065,-.285,-.062],max=[.39,.185,.142],dims=max.map((v,i)=>Math.ceil((v-min[i])/step)+1),[nx,ny,nz]=dims;
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
 for(let i=0;i<ps.length;i+=3){const [x,y,z]=ps.slice(i,i+3);
  colors.push(...handTint(x,y,z));uv.push(...handUV(x,y));
 }
 const normals=[],epsilon=.0003;
 for(let i=0;i<ps.length;i+=3){const [x,y,z]=ps.slice(i,i+3),n=V(field(x+epsilon,y,z)-field(x-epsilon,y,z),field(x,y+epsilon,z)-field(x,y-epsilon,z),field(x,y,z+epsilon)-field(x,y,z-epsilon)).normalize();normals.push(n.x,n.y,n.z);
  // Baked local occlusion gives finger webs and the wrapped grip depth even
  // on the low-load profile, which intentionally has no realtime shadow map.
  let occlusion=0;for(const distance of [.002,.005,.011])occlusion+=Math.max(0,Math.min(1,(distance-field(x+n.x*distance,y+n.y*distance,z+n.z*distance))/distance));
  const shade=1-Math.min(.22,occlusion*.095);for(let j=0;j<3;j++)colors[i+j]*=shade;
 }
 geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeBoundingSphere();
 }
 const mesh=new THREE.Mesh(geo,createHandSkin(THREE));mesh.name='Continuous forearm';mesh.userData={handSurface:'Closed five-finger anatomical sculpt',closedSurface:true,fingerCount:5,minimumSkinRadius:open?0:.0133};
 const details=[],nailMat=new THREE.MeshPhysicalMaterial({color:'#bb9584',roughness:.48,clearcoat:.12,clearcoatRoughness:.6});
 for(const [i,path] of (geo.userData.anatomical?handPaths(open):[...fingerPaths,thumb]).entries()){
  const end=V(...path.at(-1)),previous=V(...path.at(-2)),direction=end.clone().sub(previous).normalize();
  const nail=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),nailMat);nail.name=['Index','Middle','Ring','Little','Thumb'][i]+' nail';
  nail.scale.set(i===3?.0035:.0043,i===4?.0055:.0048,.0005);
  const normal=i===4?V(0,.35,1).normalize():open?V(0,0,-1):V(-.75,0,.66);normal.addScaledVector(direction,-normal.dot(direction)).normalize();
  const width=direction.clone().cross(normal).normalize();nail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(width,direction,normal));
  const base=end.clone().addScaledVector(direction,-.006);
  if(geo.userData.anatomical){
   const ray=new THREE.Raycaster(base.clone().addScaledVector(normal,.03),normal.clone().negate(),0,.06);mesh.updateMatrixWorld(true);const hit=ray.intersectObject(mesh,false)[0];
   if(hit){nail.position.copy(hit.point).addScaledVector(normal,.00008);nail.userData.surfaceAttached=true;}else {nail.visible=false;nail.position.copy(base);}
  }else{let lo=0,hi=.022;for(let j=0;j<18;j++){const t=(lo+hi)/2,p=base.clone().addScaledVector(normal,t);if(field(p.x,p.y,p.z)<0)lo=t;else hi=t;}nail.position.copy(base).addScaledVector(normal,(lo+hi)/2+.00008);}
  details.push(nail);
 }
 const result={mesh,details,fingerPaths,thumb};if(open)cachedOpen=result;else cachedGrip=result;return result;
}
