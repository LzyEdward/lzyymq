// A shaped indoor-court last, with a flat outsole and a lower, wider toe box.
// Coordinates are local to the foot bone; the outsole rests 63 mm below it.
const profile=[[-.083,.025,.058],[-.068,.042,.074],[-.012,.050,.085],[.052,.055,.075],[.12,.057,.055],[.174,.052,.026],[.195,.038,.015],[.209,.018,.009],[.214,.002,.003]];
function section(z){for(let i=1;i<profile.length;i++)if(z<=profile[i][0]){const a=profile[i-1],b=profile[i],u=Math.max(0,(z-a[0])/(b[0]-a[0]));return [a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];}return profile.at(-1).slice(1);}
export function shoeUpperHeight(x,z){const [width,height]=section(z);return -.039+height*Math.sqrt(Math.max(0,1-(x/width)**2));}
export function createCourtShoe(T,{upper,sole,trim,lace,mergeGeometries=null}={}){
 const root=new T.Group();root.name='Indoor court shoe';const V=(...p)=>new T.Vector3(...p);
 upper??=new T.MeshStandardMaterial({color:'#e4e8df',roughness:.85});sole??=new T.MeshStandardMaterial({color:'#c5bda6',roughness:.92});trim??=new T.MeshStandardMaterial({color:'#32676c',roughness:.76});lace??=new T.MeshStandardMaterial({color:'#e0dfd3',roughness:.94});
 upper.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vShoe;').replace('#include <begin_vertex>','#include <begin_vertex>\nvShoe=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vShoe;').replace('#include <color_fragment>',`#include <color_fragment>
   float toeSeam=abs(vShoe.z-(.152-.027*pow(vShoe.x/.06,2.)));
   float seam=(1.-smoothstep(.0005,.0014,toeSeam))*smoothstep(-.025,.002,vShoe.y);
   float panel=smoothstep(.025,.033,abs(vShoe.x))*(1.-smoothstep(.092,.15,vShoe.z))*smoothstep(-.016,.015,vShoe.y);
   vec2 holes=fract(vec2(vShoe.x*360.,vShoe.z*285.))-.5;
   float hole=(1.-smoothstep(.115,.21,length(holes)))*panel;
   diffuseColor.rgb*=1.-seam*.18-hole*.18;
  `);
 };upper.customProgramCacheKey=()=> 'ventilated-court-upper-v1';
 const add=(g,m,name)=>{const mesh=new T.Mesh(g,m);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
 function loft(sections,base,upperShape=false){const n=24,p=[],uv=[],index=[];
  for(const [z,w,h] of sections)for(let j=0;j<n;j++){const a=j/n*Math.PI*2,s=Math.sin(a),c=Math.cos(a),x=upperShape?s:Math.sign(s)*Math.abs(s)**.28,y=upperShape?Math.max(0,c):(.5+Math.sign(c)*Math.abs(c)**.28*.5);p.push(x*w,base(z)+y*h,z);uv.push(j/n,(z+.083)/.297);}
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;index.push(a,c,b,b,c,d);}
  for(const end of [0,sections.length-1]){const [z,,h]=sections[end],center=p.length/3;p.push(0,base(z)+h*.5,z);uv.push(.5,end?1:0);for(let j=0;j<n;j++){const a=end*n+j,b=end*n+(j+1)%n;index.push(center,...(end?[b,a]:[a,b]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;}
 add(loft(profile,()=>-.039,true),upper,'Shaped mesh upper');
 const soleSections=profile.map(([z,w])=>[z,w+.0035,.025]);
 add(loft(soleSections,z=>-.063+Math.max(0,z-.125)*.11),sole,'Rolled gum outsole');
 const edging=new T.MeshStandardMaterial({color:'#e3e2d5',roughness:.86});
 add(loft(soleSections.map(([z,w])=>[z,w+.0007,.008]),()=>-.041),edging,'Cushion sidewall');
 function tube(points,r,mat,name){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(10,points.length*4),r,5,false),mat,name);}
 for(const side of [-1,1])tube([[-.05,-.017],[-.005,.004],[.065,-.003],[.139,-.018]].map(([z,y])=>V(side*(section(z)[0]+.001),y,z)),.0033,trim,'Lateral support overlay');
 const laceParts=[];for(let i=0;i<5;i++)for(const cross of [-1,1]){
  const z=.035+i*.017,points=[[-.023*cross,z],[0,z+.007],[.023*cross,z+.013]].map(([x,zz])=>V(x,shoeUpperHeight(x,zz)+(cross>0?.0025:.0042),zz));
  laceParts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.00125,4,false));
 }
 const knotY=shoeUpperHeight(0,.046)+.0045,knotZ=.046;
 for(const side of [-1,1]){
  const loop=[V(0,knotY,knotZ),V(side*.015,knotY+.009,knotZ-.010),V(side*.022,knotY+.006,knotZ),V(side*.014,knotY+.003,knotZ+.009),V(0,knotY,knotZ)];
  laceParts.push(new T.TubeGeometry(new T.CatmullRomCurve3(loop),24,.00125,4,false));
  laceParts.push(new T.TubeGeometry(new T.CatmullRomCurve3([V(0,knotY,knotZ),V(side*.008,knotY+.003,knotZ+.012),V(side*.018,knotY-.006,knotZ+.027)]),10,.00125,4,false));
 }
 if(mergeGeometries){const merged=mergeGeometries(laceParts,false);if(merged){add(merged,lace,'Woven laces');laceParts.forEach(g=>g.dispose());}}
 else laceParts.forEach(g=>add(g,lace,'Lace'));
 const eyeletGeometry=new T.TorusGeometry(.0024,.0006,3,8),eyelets=new T.InstancedMesh(eyeletGeometry,trim,10),matrix=new T.Matrix4(),orientation=new T.Quaternion().setFromAxisAngle(V(1,0,0),-Math.PI/2);
 for(let i=0;i<5;i++)for(const [s,side] of [[0,-1],[1,1]]){const x=side*.025,z=.035+i*.017+(side>0?.013:0);matrix.compose(V(x,shoeUpperHeight(x,z)+.002,z),orientation,V(1,1,1));eyelets.setMatrixAt(i*2+s,matrix);}eyelets.name='Ten lace eyelets';root.add(eyelets);
 tube([V(-.014,.021,-.065),V(-.014,.048,-.066),V(.014,.048,-.066),V(.014,.021,-.065)],.0025,trim,'Heel pull loop');
 if(mergeGeometries){
  const buckets=new Map();for(const mesh of [...root.children])if(mesh.isMesh&&!mesh.isInstancedMesh){if(!buckets.has(mesh.material))buckets.set(mesh.material,[]);buckets.get(mesh.material).push(mesh);}
  for(const [material,meshes] of buckets)if(meshes.length>1){const geometry=mergeGeometries(meshes.map(m=>m.geometry),false);if(geometry){const mesh=add(geometry,material,meshes.map(m=>m.name).join(' / '));for(const old of meshes){root.remove(old);old.geometry.dispose();}}}
 }
 root.userData={length:.297,outsoleBottom:-.063,last:'wide forefoot / lower toe / raised instep',laceRows:5,laceDirections:2,bowLoops:2};return root;
}
