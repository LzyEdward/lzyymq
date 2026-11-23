import {createPortraitHead} from './portrait-head.mjs';

// Local origin is the chair cushion. The official faces forward (+Z).
export function createUmpire(T,mergeGeometries){
 const root=new T.Group(),parts=new Map(),up=new T.Vector3(0,1,0);
 root.name='Chair umpire';
 const material=(color,roughness=.82,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const blazer=material('#234256'),lapel=material('#315669'),shirt=material('#f0e9db');
 const slacks=material('#303b48'),skin=material('#c09886'),leather=material('#25282e',.43);
 const brass=material('#d7b474',.45,.32),hair=material('#312729'),red=material('#ba6254');
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 function part(geometry,mat,pos,scale,rotation){
  const transform=new T.Object3D();transform.position.copy(pos);
  if(scale)transform.scale.copy(scale);
  if(rotation)transform.quaternion.copy(rotation);
  transform.updateMatrix();geometry.applyMatrix4(transform.matrix);
  if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(geometry);
 }
 function oval(mat,x,y,z,rx,ry,rz){
  part(new T.SphereGeometry(1,16,12),mat,v(x,y,z),v(rx,ry,rz));
 }
 function segment(mat,a,b,r0,r1,depth=1){
  const d=b.clone().sub(a);
  part(new T.CylinderGeometry(r1,r0,d.length(),14),mat,a.clone().lerp(b,.5),v(1,1,depth),
   new T.Quaternion().setFromUnitVectors(up,d.normalize()));
 }
 function panel(mat,points){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
  g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  // Non-indexed panel surfaces have their own material and include reverse-facing lapel folds.
  mat.side=T.DoubleSide;part(g,mat,v(0,0,0));
 }
 // Shaped jacket, fitted waist and turned lapels over a cream shirt.
 const rings=[[.035,.215,.135],[.12,.192,.133],[.22,.156,.124],[.37,.192,.145],
  [.45,.212,.125],[.49,.176,.105],[.516,.08,.065]];
 const coat=new T.LatheGeometry(rings.map(([y,x])=>new T.Vector2(x,y)),32);
 const pos=coat.attributes.position;
 for(let j=0;j<pos.count;j++)pos.setZ(j,pos.getZ(j)*rings[j%rings.length][2]/rings[j%rings.length][1]);
 coat.computeVertexNormals();part(coat,blazer,v(0,.045,-.016));
 panel(shirt,[[-.063,.553,.043],[.063,.553,.043],[.045,.448,.112],[0,.355,.133]]);
 for(const s of [-1,1]){
  panel(lapel,[[s*.070,.55,.061],[s*.149,.487,.092],[s*.092,.451,.122],[0,.337,.134]]);
  panel(shirt,[[s*.02,.553,.059],[s*.071,.560,.046],[s*.078,.516,.088],[s*.032,.49,.104]]);
  const hip=v(s*.107,.062,.012),knee=v(s*.124,.016,.35),ankle=v(s*.137,-.374,.345);
  segment(slacks,hip,knee,.096,.072);oval(slacks,knee.x,knee.y,knee.z,.072,.072,.072);
  segment(slacks,knee,ankle,.071,.049);oval(leather,ankle.x,-.406,.392,.066,.051,.123);
  const shoulder=v(s*.178,.483,-.005),elbow=v(s*.211,.255,.042),wrist=v(s*.137,.228,.213);
  oval(blazer,shoulder.x,shoulder.y,shoulder.z,.072,.071,.077);
  segment(blazer,shoulder,elbow,.070,.054);oval(blazer,elbow.x,elbow.y,elbow.z,.055,.055,.055);
  segment(blazer,elbow,wrist,.055,.040);segment(shirt,wrist,wrist.clone().add(v(0,-.001,.013)),.039,.038);
  oval(skin,wrist.x,.22,.247,.039,.020,.052);
  for(let f=0;f<4;f++)oval(skin,wrist.x+(f-1.5)*.015,.211,.276,.009,.011,.033-Math.abs(f-1)*.003);
 }
 for(const y of [.31,.235])oval(brass,.013,y,.122,.010,.010,.005);
 panel(brass,[[.071,.441,.129],[.117,.441,.121],[.114,.406,.126],[.08,.404,.134]]);
 panel(red,[[.08,.435,.133],[.109,.435,.128],[.106,.417,.130],[.084,.415,.136]]);
 oval(skin,0,.561,-.006,.063,.078,.059);
 // Gathered hair falls behind the collar; keep the photo and its glasses visible from the court.
 oval(hair,0,.648,-.092,.10,.134,.056);
 oval(hair,0,.598,-.131,.060,.063,.046);
 // Slim score tablet on the lap, screen tilted toward the official.
 const tilt=new T.Quaternion().setFromAxisAngle(v(1,0,0),.21);
 part(new T.BoxGeometry(.231,.016,.152),leather,v(0,.194,.256),null,tilt);
 part(new T.BoxGeometry(.209,.003,.130),lapel,v(0,.205,.256),null,tilt);
 for(const [mat,geos] of parts){
  // Procedural panels do not use texture coordinates; standardise attributes for batching.
  for(const g of geos)g.deleteAttribute('uv');
  const model=new T.Mesh(mergeGeometries(geos,false),mat);
  model.castShadow=true;root.add(model);geos.forEach(g=>g.dispose());
 }
 const map=new T.TextureLoader().load(new URL('./assets/textures/official-head.webp',import.meta.url).href);
 const pivot=new T.Group();pivot.name='Umpire gaze';pivot.position.set(0,.568,-.01);root.add(pivot);
 const head=createPortraitHead(T,map,v(0,1.553,.042),{headphones:false,name:'裁判 · 照片头模'});
 pivot.add(head);
 return {root,pivot};
}
