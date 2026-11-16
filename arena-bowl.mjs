import {arenaSeats} from './arena-layout.mjs';

export function createArenaBowl(T,mergeGeometries){
 const group=new T.Group();group.name='Four-sided competition arena';
 const mat=(color,roughness=.87,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const concrete=mat('#303139'),trim=mat('#756889',.65,.15),seatMat=mat('#55405f'),cloth=mat('#ffffff'),skin=mat('#ffffff'),hairMat=mat('#ffffff'),pants=mat('#252a33'),metal=mat('#93949b',.4,.65);
 const accent=mat('#775789'),aisleLight=new T.MeshBasicMaterial({color:'#bfb49a',toneMapped:true});
 const batches=new Map(),dummy=new T.Object3D();
 function box(w,h,d,m,x,y,z,ry=0){
  if(!batches.has(m))batches.set(m,[]);
  const g=new T.BoxGeometry(w,h,d);dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(1,1,1);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);batches.get(m).push(g);
 }
 function rail(x,z,y,length,sideways=false){
  box(sideways?.035:length,.035,sideways?length:.035,metal,x,y,z);
  const count=Math.ceil(length/2.4);
  for(let i=0;i<=count;i++)box(.032,.92,.032,metal,x+(sideways?0:(i/count-.5)*length),y-.46,z+(sideways?(i/count-.5)*length:0));
 }
 for(let row=0;row<18;row++){
  const height=.24+row*.37,half=Math.min(22,7.5+row*.85);
  for(const side of [-1,1]){
   box(.82,height,26.4,concrete,side*(8.8+row*.82),height/2-.015,0);
   box(half*2,height,.88,concrete,0,height/2-.015,side*(14.2+row*.88));
   // Warm step nosings only in the aisles; no full-width glowing strips.
   for(const z of [-7.2,0,7.2])box(.055,.014,.8,aisleLight,side*(8.41+row*.82),height+.008,z);
   for(const x of [-9,0,9])if(Math.abs(x)<half-.5)box(.8,.014,.045,aisleLight,x,height+.008,side*(13.78+row*.88));
  }
 }
 // Continuous, low competition fascia. The court remains the brightest surface.
 for(const side of [-1,1]){
  box(.14,.82,26.8,accent,side*8.22,.41,0);rail(side*8.2,0,1.19,26.8,true);
  box(15.4,.82,.14,accent,0,.41,side*13.62);rail(0,side*13.64,1.19,15.4);
  rail(side*23.2,0,7.5,27,true);rail(0,side*30.4,7.5,44);
  // Rear concourse, dark entry portals and acoustic panels at the actual wall.
  box(46,.22,1.8,concrete,0,7.0,side*30.65);
  for(const x of [-18,-6,6,18]){
   box(2.1,2.9,.08,pants,x,8.56,side*31.73);
   box(2.2,.10,.16,trim,x,10.05,side*31.65);
   box(.45,.13,.02,aisleLight,x,9.68,side*31.55);
  }
  // Alternating acoustic fins give the upper arena walls depth and scale.
  for(let x=-22;x<=22;x+=1.2)box(.62,4.6,.18,trim,x,13.45,side*31.62);
  box(46,.48,.22,accent,0,10.5,side*31.6);
  for(let z=-28;z<=28;z+=2.4)box(.18,3.9,.8,trim,side*24.75,17.7,z);
 }
 const seats=arenaSeats();
 function localBox(w,h,d,x,y,z,rx=0){const g=new T.BoxGeometry(w,h,d);g.rotateX(rx);g.translate(x,y,z);return g;}
 // Seats have inclined backs, cushions, and a shared mounting bracket.
 const seatParts=[localBox(.43,.065,.38,0,.43,0),localBox(.43,.40,.05,0,.66,-.20,-.10),localBox(.055,.40,.055,0,.22,0)];
 const seatGeo=mergeGeometries(seatParts,false);seatParts.forEach(g=>g.dispose());
 const seatMesh=new T.InstancedMesh(seatGeo,seatMat,seats.length);seatMesh.name='Moulded seats with backrests';
 const people=seats.filter((_,i)=>((i*73+17)%100)>10);
 // These silhouettes sit 10–35 metres away. Smooth normals and colour carry
 // detail more cheaply than subdividing every distant arm and head.
 const torsos=new T.InstancedMesh(new T.SphereGeometry(1,7,4),cloth,people.length),heads=new T.InstancedMesh(new T.SphereGeometry(1,7,4),skin,people.length),hairs=new T.InstancedMesh(new T.SphereGeometry(1,7,3,0,Math.PI*2,0,Math.PI*.55),hairMat,people.length);
 const limbs=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,4,1,true),skin,people.length*4),legs=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,4,1,true),pants,people.length*4);
 torsos.name='Seated spectator shoulders and torsos';heads.name='Spectator heads';
 const shirts=['#b6c0c8','#778296','#94827a','#b3a77b','#657f7b','#af929a','#7285a4','#c1bbac'],skins=['#c49375','#d9b292','#916149','#b37a59'],hairsPalette=['#262325','#42332e','#695545','#9e8b73'];
 const place=(mesh,i,p,offset,scale,rot=0,color)=>{
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw),[x,y,z]=offset;
  dummy.position.set(p.x+x*c+z*s,p.y+y,p.z-x*s+z*c);dummy.rotation.set(rot,p.yaw,0);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(color)mesh.setColorAt(i,new T.Color(color));
 };
 seats.forEach((p,i)=>place(seatMesh,i,p,[0,0,0],[1,1,1]));
 people.forEach((p,i)=>{
  const lean=((i*19)%11-5)*.008,skinColor=skins[i%skins.length];
  place(torsos,i,p,[0,.73,.015+lean],[.19,.27,.12],-.08,shirts[(i*17+Math.floor(i/23))%shirts.length]);
  place(heads,i,p,[0,1.08,.035+lean],[.097,.125,.095],0,skinColor);
  place(hairs,i,p,[0,1.115,.027+lean],[.10,.107,.098],0,hairsPalette[i%4]);
  for(const side of [-1,1]){
   const n=i*4+(side>0?2:0);
   place(limbs,n,p,[side*.20,.73,.07],[.035,.24,.035],-.4,skinColor);
   place(limbs,n+1,p,[side*.19,.59,.19],[.029,.21,.029],-1.3,skinColor);
   place(legs,n,p,[side*.095,.44,.15],[.065,.29,.065],Math.PI/2);
   place(legs,n+1,p,[side*.095,.24,.29],[.047,.32,.047]);
  }
 });
 for(const o of [seatMesh,torsos,heads,hairs,limbs,legs]){o.instanceMatrix.needsUpdate=true;o.castShadow=false;o.receiveShadow=false;o.computeBoundingSphere();group.add(o);}
 // All architecture uses a small shared set of material batches.
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts,false),m=new T.Mesh(geometry,material);m.receiveShadow=false;group.add(m);parts.forEach(g=>g.dispose());}
 group.userData.capacity=seats.length;group.userData.spectators=people.length;
 group.userData.applyVenue=(spec={})=>{accent.color.set(spec.accent||'#775789');group.userData.eventId=spec.id||'';};
 return group;
}
