import {headRings} from './spectator-head.mjs';
import {arenaSeats} from './arena-layout.mjs';

export function createArenaBowl(T,mergeGeometries){
 const group=new T.Group();group.name='Four-sided competition arena';
 const mat=(color,roughness=.87,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const concrete=mat('#303338'),trim=mat('#5f6570',.78,.08),seatMat=mat('#444951'),cloth=mat('#ffffff'),skin=mat('#ffffff'),hairMat=mat('#ffffff'),pants=mat('#252a33'),metal=mat('#93949b',.4,.65);
 const accent=mat('#3c464b'),aisleLight=new T.MeshBasicMaterial({color:'#bfb49a',toneMapped:true});
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
 // Upper-deck bays and lit vomitories break up the long wall behind the bowl.
 for(const sign of [-1,1]){
  for(const x of [-15,-5,5,15]){
   box(6.6,.22,1.55,trim,x,8.42,sign*30.35);
   box(6.4,.14,.08,aisleLight,x,8.19,sign*29.70);
   box(.20,3.10,.85,concrete,x-3.25,9.74,sign*30.42);
   box(.20,3.10,.85,concrete,x+3.25,9.74,sign*30.42);
  }
 }
 if(typeof document!=='undefined'){
  const surface=new T.TextureLoader().load(new URL('./assets/textures/concourse-concrete.webp',import.meta.url).href);
  surface.colorSpace=T.SRGBColorSpace;surface.wrapS=surface.wrapT=T.RepeatWrapping;surface.repeat.set(3,1);
  concrete.map=surface;concrete.color.set('#777c80');
 }
 const seats=arenaSeats();
 function localBox(w,h,d,x,y,z,rx=0){const g=new T.BoxGeometry(w,h,d);g.rotateX(rx);g.translate(x,y,z);return g;}
 // Seats have inclined backs, cushions, and a shared mounting bracket.
 const seatParts=[localBox(.43,.065,.38,0,.43,0),localBox(.43,.40,.05,0,.66,-.20,-.10),localBox(.055,.40,.055,0,.22,0)];
 const seatGeo=mergeGeometries(seatParts,false);seatParts.forEach(g=>g.dispose());
 const seatMesh=new T.InstancedMesh(seatGeo,seatMat,seats.length);seatMesh.name='Moulded seats with backrests';
 const occupied=seats.filter((_,i)=>((i*73+17)%100)>10);
 // A contiguous prefix lets each animated body-part batch upload just its changed matrices.
 const active=[],quiet=[];
 occupied.forEach((p,i)=>{
  const threshold=p.row<5?58:p.row<11?32:13;
  (((i*47+Math.floor(i/17)*13)%100)<threshold?active:quiet).push(p);
 });
 const people=active.concat(quiet);
 // These silhouettes sit 10–35 metres away. Smooth normals and colour carry
 // detail more cheaply than subdividing every distant arm and head.
 const vertices=[],uv=[],indices=[];
 headRings.forEach((ring,row)=>ring.forEach((point,col)=>{
  vertices.push(...point);uv.push(col/(ring.length-1),row/(headRings.length-1));
  if(row&&col){const i=row*ring.length+col;indices.push(i-ring.length-1,i-ring.length,i,i-ring.length-1,i,i-1);}
 }));
 const face=new T.BufferGeometry();face.setAttribute('position',new T.Float32BufferAttribute(vertices,3));face.setAttribute('uv',new T.Float32BufferAttribute(uv,2));face.setIndex(indices);face.computeVertexNormals();
 const jersey=new T.LatheGeometry([[.68,-1],[.86,-.82],[.96,.15],[1,.54],[.86,.71],[.42,.94]].map(([x,y])=>new T.Vector2(x,y)),7);
 const torsos=new T.InstancedMesh(jersey,cloth,people.length),heads=new T.InstancedMesh(face,skin,people.length),hairs=new T.InstancedMesh(new T.SphereGeometry(1,7,3,0,Math.PI*2,0,Math.PI*.55),hairMat,people.length);
 const limbs=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,4,1,true),skin,people.length*4),legs=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,4,1,true),pants,people.length*4);
 const palms=new T.InstancedMesh(new T.SphereGeometry(1,6,4),skin,people.length*2);
 if(typeof document!=='undefined'){
  heads.material=skin.clone();
  heads.material.map=new T.TextureLoader().load(new URL('./assets/textures/stand-faces.webp',import.meta.url).href);
  heads.material.map.colorSpace=T.SRGBColorSpace;
 }
 torsos.name='Seated spectator shoulders and torsos';heads.name='Spectator heads';
 const shirts=['#b6c0c8','#778296','#94827a','#b3a77b','#657f7b','#af929a','#7285a4','#c1bbac'],skins=['#c49375','#d9b292','#916149','#b37a59'],hairsPalette=['#262325','#42332e','#695545','#9e8b73'];
 const place=(mesh,i,p,offset,scale,rot=0,color)=>{
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw),[x,y,z]=offset;
  dummy.position.set(p.x+x*c+z*s,p.y+y,p.z-x*s+z*c);dummy.rotation.set(rot,p.yaw,0);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(color)mesh.setColorAt(i,new T.Color(color));
 };
 seats.forEach((p,i)=>place(seatMesh,i,p,[0,0,0],[1,1,1]));
 const up=new T.Vector3(0,1,0),direction=new T.Vector3(),yawQ=new T.Quaternion();
 const mix=T.MathUtils.lerp,smooth=T.MathUtils.smoothstep;
 function segment(mesh,index,p,ax,ay,az,bx,by,bz,radius){
  direction.set(bx-ax,by-ay,bz-az);
  const length=direction.length(),mx=(ax+bx)*.5,mz=(az+bz)*.5;
  dummy.position.set(p.x+mx*p.cos+mz*p.sin,p.y+(ay+by)*.5,p.z-mx*p.sin+mz*p.cos);
  dummy.quaternion.setFromUnitVectors(up,direction.multiplyScalar(1/length)).premultiply(yawQ);
  dummy.scale.set(radius,length,radius);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
 }
 function pose(p,i,time,age,power,attention=0,side=0){
  const local=age-p.delay-(side&&side*p.x<0?.18:0);
  const response=power*smooth(local,0,.35)*(1-smooth(local,1.32,2.05));
  const stand=smooth(response,p.threshold,1),beat=Math.sin(time*p.tempo+i);
  const idle=Math.sin(time*(1.1+.13*(i%6))+i)*.022;
  const build=.90+(i*7%11)*.022,neck=.018*Math.sin(i*1.9),tilt=.04*Math.sin(i+time*.54);
  const lift=stand*.36,lean=p.lean+idle+stand*.075+attention*(.045+.025*Math.sin(i));
  const hip=.48+lift,shoulder=.89+lift;
  place(torsos,i,p,[0,.73+lift,.015+lean],[.19*build,.27,.12*build],-.08+stand*.09+p.lean*.2);
  place(heads,i,p,[idle*.38,1.08+lift+neck,.035+lean],[.097*build,.125,.095],tilt);
  place(hairs,i,p,[idle*.38,1.118+lift+neck,.021+lean],[.10*build,.095+(i%5)*.007,.095+(i%3)*.008],tilt);
  yawQ.setFromAxisAngle(up,p.yaw);
  for(const side of [-1,1]){
   const n=i*4+(side>0?2:0), sx=side*.157;
   const clap=p.waves&&side>0?0:response;
   const wave=p.waves&&(i%3===0||side>0)?response*smooth(power,.44,.80):0;
   const ex=side*(.205+.09*wave+.026*clap),ey=shoulder-.194+.30*wave+.055*clap;
   const ez=lean+.061+.025*wave+.07*clap;
   const wx=side*(.177+.13*wave+.075*beat*wave-clap*(.13+.04*beat));
   const wy=shoulder-.295+.61*wave+.26*clap+.02*idle;
   const wz=lean+.223-.14*wave+.07*clap;
   segment(limbs,n,p,sx,shoulder,.012+lean,ex,ey,ez,.042);
   segment(limbs,n+1,p,ex,ey,ez,wx,wy,wz,.032);
   place(palms,i*2+(side>0?1:0),p,[wx,wy,wz],[.041,.049,.027],-.35*clap);
   const kneeZ=mix(.30,.19,stand);
   segment(legs,n,p,side*.094,hip,.012+lean,side*.11,.43,kneeZ,.070);
   segment(legs,n+1,p,side*.11,.43,kneeZ,side*.115,.055,.22,.052);
  }
 }
 people.forEach((p,i)=>{
  p.sin=Math.sin(p.yaw);p.cos=Math.cos(p.yaw);p.lean=((i*19)%11-5)*.007;
  p.delay=((i*17)%23)*.017+p.row*.007;p.tempo=6+i%5;
  p.threshold=.16+(i*31%13)*.032;p.waves=i%4!==0;
  const skinColor=new T.Color(skins[i%skins.length]);
  torsos.setColorAt(i,new T.Color(shirts[(i*17+Math.floor(i/23))%shirts.length]));
  heads.setColorAt(i,skinColor);hairs.setColorAt(i,new T.Color(hairsPalette[i%4]));
  palms.setColorAt(i*2,skinColor);palms.setColorAt(i*2+1,skinColor);
  for(let j=0;j<4;j++)limbs.setColorAt(i*4+j,skinColor);
  pose(p,i,0,-1,0);
 });
 const moving=[torsos,heads,hairs,limbs,legs,palms];
 let lastTime=-Infinity;
 for(const o of moving)o.instanceMatrix.setUsage(T.DynamicDrawUsage);
 group.userData.updateCrowd=(time,age=-1,power=0,attention=0,side=0)=>{
  if(time>=lastTime&&time-lastTime<1/(age>=0?18:6))return;
  lastTime=time;
  for(let i=0;i<active.length;i++)pose(people[i],i,time,age,power,attention,side);
  for(const mesh of moving){
   const attribute=mesh.instanceMatrix;
   attribute.clearUpdateRanges();
   attribute.addUpdateRange(0,active.length*(mesh===limbs||mesh===legs?4:mesh===palms?2:1)*16);
   attribute.needsUpdate=true;
  }
 };
 for(const o of [seatMesh,...moving]){o.instanceMatrix.needsUpdate=true;o.castShadow=false;o.receiveShadow=false;o.computeBoundingSphere();group.add(o);}
 // All architecture uses a small shared set of material batches.
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts,false),m=new T.Mesh(geometry,material);m.receiveShadow=false;group.add(m);parts.forEach(g=>g.dispose());}
 // Sewn banners hang from the front rail, facing the players on all four sides.
 const banners=[];
 const panels=[[-3.6,-13.49,0,0],[4,-13.49,0,1],[3.5,13.49,Math.PI,3],
  [-8.06,-4,Math.PI/2,2],[-8.06,6,Math.PI/2,1],[8.06,-4,-Math.PI/2,3]];
 for(const [x,z,yaw,tile] of panels){
  const clothPanel=new T.PlaneGeometry(3.85,.76,24,3);
  const {position,uv}=clothPanel.attributes;
  for(let i=0;i<position.count;i++){
   const s=uv.getX(i),v=uv.getY(i);
   position.setY(i,position.getY(i)-.055*Math.sin(Math.PI*s));
   position.setZ(i,.035*Math.sin(s*29+.6*v)+.014*Math.sin(s*57));
   uv.setY(i,1-(tile+1-v)/4);
  }
  clothPanel.computeVertexNormals();clothPanel.rotateY(yaw);clothPanel.translate(x,.78,z);banners.push(clothPanel);
 }
 const bannerMaterial=new T.MeshStandardMaterial({roughness:1});
 if(typeof document!=='undefined'){
  const atlas=new T.TextureLoader().load(new URL('./assets/textures/supporter-banners.webp',import.meta.url).href);
  atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;bannerMaterial.map=atlas;
 }
 const clothBanners=new T.Mesh(mergeGeometries(banners,false),bannerMaterial);
 clothBanners.name='Supporters’ rail banners';group.add(clothBanners);banners.forEach(g=>g.dispose());
 group.userData.capacity=seats.length;group.userData.spectators=people.length;
 const fasciaColor=new T.Color('#3c464b'),eventColor=new T.Color();
 group.userData.applyVenue=(spec={})=>{
  eventColor.set(spec.accent||'#3c464b');
  accent.color.copy(fasciaColor).lerp(eventColor,.07);
  // Supporter blocks keep individual shirts and echo the tournament colours.
  const shirtColor=new T.Color();
  people.forEach((p,i)=>{
   if(p.row>10||p.section!=='N'&&p.section!=='S'||Math.abs(p.x)>6||i%4===0)return;
   shirtColor.set(shirts[(i*17+Math.floor(i/23))%shirts.length]).lerp(eventColor,.34+(i%3)*.12);
   torsos.setColorAt(i,shirtColor);
  });
  torsos.instanceColor.needsUpdate=true;
  group.userData.eventId=spec.id||'';
 };
 return group;
}
