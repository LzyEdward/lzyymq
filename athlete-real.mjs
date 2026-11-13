import * as data from './assets/athlete-data.mjs?v=7.14.0';
import {FootPlant} from './footwork.mjs?v=7.14.0';
import {createCourtShoe} from './court-shoe.mjs?v=7.14.0';
import {necklineDistances} from './garment-surfaces.mjs?v=7.14.0';
import {shortHairProfile,HAIRLINE_GLSL} from './hair-surface.mjs?v=7.14.0';

// A continuous CC0 anatomical mesh, 48-bone skin, and two-bone limb IK.
export function createAthlete(THREE, createRacket,{skinMap=null,mergeGeometries=null}={}) {
 const root=new THREE.Group(),body=new THREE.Group();root.name='Athlete · anatomical skin · 1.81m';root.add(body);
 const vec=(...v)=>new THREE.Vector3(...v),clamp=THREE.MathUtils.clamp,bones={},bind={};
 for(const spec of data.bones){const bone=new THREE.Bone();bone.name=spec.name;bones[spec.name]=bone;bind[spec.name]=vec(...spec.position);}
 for(const spec of data.bones){const parent=spec.parent?bones[spec.parent]:body;bones[spec.name].position.copy(bind[spec.name]);if(spec.parent)bones[spec.name].position.sub(bind[spec.parent]);parent.add(bones[spec.name]);}
 body.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(data.bones.map(spec=>bones[spec.name]));skeleton.calculateInverses();
 function grain(size,cloth=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(Math.sin(x*71.3+y*113.1)*43758.5453)%1,c=Math.floor(128+n*(cloth?23:13));ctx.fillStyle='rgb('+c+','+c+','+c+')';ctx.fillRect(x,y,1,1);}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(cloth?24:9,cloth?24:9);return texture;
 }
 const weave=grain(32,true),skin=new THREE.MeshPhysicalMaterial({vertexColors:!skinMap,map:skinMap,roughness:.66,bumpMap:grain(64),bumpScale:.00022,clearcoat:.008,clearcoatRoughness:.8,sheen:.055,sheenColor:'#c39882'});
 const jersey=new THREE.MeshPhysicalMaterial({color:'#e3e9df',roughness:.9,bumpMap:weave,bumpScale:.00034,sheen:.42,sheenRoughness:.9,sheenColor:'#ffffff'});
 jersey.onBeforeCompile=shader=>{
  shader.uniforms.uCollarColor={value:trim.color};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;\nattribute float necklineDistance;\nvarying float vNeckline;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCloth=position;\nvNeckline=necklineDistance;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;\nvarying float vNeckline;\nuniform vec3 uCollarColor;').replace('#include <color_fragment>',`#include <color_fragment>
   float panel=smoothstep(.163,.195,abs(vCloth.x))*(1.-smoothstep(1.25,1.34,vCloth.y))*smoothstep(.99,1.045,vCloth.y);
   float hem=1.-smoothstep(.003,.010,abs(vCloth.y-.992));
   float cuff=smoothstep(.22,.25,abs(vCloth.x))*(1.-smoothstep(.002,.008,abs(vCloth.y-1.316)));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.15,.155),panel*.83+hem*.45+cuff*.8);
   float seam=1.-smoothstep(.001,.0025,abs(vCloth.y-1.388+abs(vCloth.x)*.13));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.38,.37),seam*.28);
   float sideFold=sin(vCloth.y*112.+abs(vCloth.x)*27.)*sin(vCloth.y*61.-vCloth.x*18.);
   float foldMask=smoothstep(.99,1.03,vCloth.y)*(1.-smoothstep(1.24,1.39,vCloth.y))*smoothstep(.025,.15,abs(vCloth.x));
   diffuseColor.rgb*=1.+sideFold*.023*foldMask;
   float stitch=1.-smoothstep(.0006,.0016,abs(abs(vCloth.x)-.176));
   diffuseColor.rgb*=1.-stitch*.07*smoothstep(1.03,1.12,vCloth.y)*(1.-smoothstep(1.32,1.39,vCloth.y));
   float collar=1.-smoothstep(.0052,.0065,vNeckline);
   float rib=sin(atan(vCloth.x,vCloth.z+.005)*310.);
   diffuseColor.rgb=mix(diffuseColor.rgb,uCollarColor*(.94+rib*.035),collar);
  `);
 };
 jersey.customProgramCacheKey=()=> 'court-performance-jersey-mesh-collar-v5';
 const shorts=new THREE.MeshPhysicalMaterial({color:'#1c343c',roughness:.9,bumpMap:weave,bumpScale:.001,sheen:.4});
 const hairGrain=grain(64);hairGrain.repeat.set(70,70);
 const sock=new THREE.MeshStandardMaterial({color:'#dedfd4',roughness:.95,bumpMap:weave,bumpScale:.0006}),hair=new THREE.MeshPhysicalMaterial({color:'#111713',roughness:.83,bumpMap:hairGrain,bumpScale:.00012,sheen:.18});
 hair.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHairRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHairRest=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHairRest;\n'+HAIRLINE_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
   float edge=vHairRest.y-hairlineHeight(vHairRest);
   if(edge<0.)discard;
   if(abs(vHairRest.x)>.075&&vHairRest.y<1.7&&vHairRest.z>.02)discard;
   float phase=vHairRest.x*2700.+sin(vHairRest.z*210.)*1.7+vHairRest.y*880.;
   float strand=sin(phase)*(1.-smoothstep(.9,3.1,fwidth(phase)));
   float grainPhase=vHairRest.z*4300.+vHairRest.x*1900.;
   float follicle=sin(grainPhase)*(1.-smoothstep(.9,3.1,fwidth(grainPhase)));
   float fade=smoothstep(0.,.0025,edge);
   float stipple=fract(sin(dot(floor(vHairRest.xy*2900.),vec2(12.9898,78.233)))*43758.5453);
   if(fade<stipple*.88)discard;
   diffuseColor.rgb*=.76+strand*.16+follicle*.10;
  `);
 };hair.customProgramCacheKey=()=> 'tapered-crop-hair-antialiased-v2';hair.alphaToCoverage=true;
 const trim=new THREE.MeshStandardMaterial({color:'#378683',roughness:.74}),black=new THREE.MeshStandardMaterial({color:'#24363d',roughness:.77}),meshes=[];
 function geometry(indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data.skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data.skinWeight,4));g.setIndex(new THREE.Uint16BufferAttribute(indices,1));g.computeVertexNormals();return g;}
 const allNormals=new THREE.Float32BufferAttribute(data.normals,3);
 function skinMesh(indices,material){const g=geometry(indices);g.setAttribute('normal',allNormals.clone());const m=new THREE.SkinnedMesh(g,material);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;body.add(m);m.bind(skeleton);meshes.push(m);return m;}
 const torso=skinMesh(data.indices1,jersey),anatomySkin=skinMesh(data.indices0,skin);skinMesh(data.indices2,shorts);skinMesh(data.indices3,sock);
 torso.geometry.setAttribute('necklineDistance',new THREE.Float32BufferAttribute(necklineDistances(data.positions,data.indices1).distances,1));
 // Cloth bridges the small anatomical hollows instead of painting a shirt
 // directly on the chest. Keep shoulder and sleeve seams in the original rig.
 const cloth=torso.geometry.attributes.position;
 for(const i of new Set(data.indices1)){
  const x=cloth.getX(i),y=cloth.getY(i),z=cloth.getZ(i),edge=1-THREE.MathUtils.smoothstep(Math.abs(x),.135,.225);
  const middle=THREE.MathUtils.smoothstep(y,.985,1.05)*(1-THREE.MathUtils.smoothstep(y,1.43,1.49))*edge;
  const front=.151+Math.exp(-Math.pow((y-1.34)/.12,2))*.016;
  const envelope=z>0?Math.max(z,front):Math.min(z,-.115);
  const folds=(Math.sin(y*95+x*16)*.0017+Math.sin(x*82+y*22)*.0011)*(1-THREE.MathUtils.smoothstep(y,1.24,1.41));
  cloth.setZ(i,z+(envelope-z)*middle+folds*middle*(z>0?1:-1));
 }
 // Average normals across coincident UV vertices. Recomputing each UV island
 // separately produced a comb-like rim along the neckline under grazing light.
 const smoothCloth=torso.geometry.clone();smoothCloth.computeVertexNormals();
 const clothNormals=torso.geometry.attributes.normal,normalGroups=new Map(),clothKeys=new Map();
 for(const i of new Set(data.indices1)){
  const key=[cloth.getX(i),cloth.getY(i),cloth.getZ(i)].map(n=>n.toFixed(5)).join(',');clothKeys.set(i,key);
  if(!normalGroups.has(key))normalGroups.set(key,vec());normalGroups.get(key).add(vec().fromBufferAttribute(smoothCloth.attributes.normal,i));
 }
 for(const normal of normalGroups.values())normal.normalize();
 for(const [i,key] of clothKeys){const normal=normalGroups.get(key);clothNormals.setXYZ(i,normal.x,normal.y,normal.z);}
 smoothCloth.dispose();
 const scalp=[];
 for(let i=0;i<data.indices0.length;i+=3){const vs=data.indices0.slice(i,i+3),y=vs.reduce((s,v)=>s+data.positions[v*3+1]/3,0);if(y>1.66)scalp.push(...vs);}
 const scalpMesh=skinMesh(scalp,hair),sp=scalpMesh.geometry.attributes.position,ns=scalpMesh.geometry.attributes.normal;
 for(let i=0;i<sp.count;i++){const amount=shortHairProfile(sp.getX(i),sp.getY(i),sp.getZ(i)).shell;sp.setXYZ(i,sp.getX(i)+ns.getX(i)*amount,sp.getY(i)+ns.getY(i)*amount,sp.getZ(i)+ns.getZ(i)*amount);}
 // Short, curved clumps break the helmet silhouette. One opaque mesh, no
 // alpha cards, depth sorting, particles or per-frame hair simulation.
 const hairFaces=[];let hairArea=0,hairSeed=56191;
 const hairRandom=()=>{hairSeed=(Math.imul(hairSeed,1664525)+1013904223)>>>0;return hairSeed/4294967296;};
 for(let i=0;i<scalp.length;i+=3){const ids=scalp.slice(i,i+3),points=ids.map(id=>vec(...data.positions.slice(id*3,id*3+3))),area=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).length()*.5;if(area>1e-9){hairArea+=area;hairFaces.push({ids,points,area:hairArea});}}
 const tuftPosition=[],tuftColor=[],tuftIndex=[];
 for(let i=0;i<4800&&hairFaces.length;i++){
  const choice=hairRandom()*hairArea,face=hairFaces.find(f=>f.area>=choice),u=Math.sqrt(hairRandom()),w=[1-u,u*(1-hairRandom()),0];w[2]=1-w[0]-w[1];
  const p=vec(),normal=vec();for(let k=0;k<3;k++){p.addScaledVector(face.points[k],w[k]);normal.addScaledVector(vec(...data.normals.slice(face.ids[k]*3,face.ids[k]*3+3)),w[k]);}
  const profile=shortHairProfile(p.x,p.y,p.z);if(!profile.covered||profile.length<.0003)continue;
  normal.normalize();p.addScaledVector(normal,profile.shell*.90).sub(bind.head);
  const comb=vec(-.35,.12,-1);comb.addScaledVector(normal,-comb.dot(normal)).normalize();
  const length=profile.length*(.40+hairRandom()*.35),direction=comb.addScaledVector(normal,.24).normalize(),width=.00018+hairRandom()*.00014;
  const side=vec(1,0,0).addScaledVector(direction,-direction.x).normalize(),other=direction.clone().cross(side).normalize();
  for(const across of [side,other]){
   const middle=p.clone().addScaledVector(direction,length*.55),tip=p.clone().addScaledVector(direction,length).add(vec(0,0,-length*.12)),base=tuftPosition.length/3;
   for(const [point,offset,shade] of [[p,-width,.011],[p,width,.011],[middle,-width*.65,.016],[middle,width*.65,.016],[tip,0,.023]]){tuftPosition.push(...point.clone().addScaledVector(across,offset).toArray());tuftColor.push(shade*.96,shade*.88,shade*.76);}
   tuftIndex.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3);
  }
 }
 const tuftGeometry=new THREE.BufferGeometry();tuftGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tuftPosition,3));tuftGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tuftColor,3));tuftGeometry.setIndex(tuftIndex);tuftGeometry.computeVertexNormals();
 const shortHair=new THREE.Mesh(tuftGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,side:THREE.DoubleSide}));shortHair.name='Short anatomical hair clumps';bones.head.add(shortHair);
 function add(geo,mat,parent=body){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function oval(parent,mat,p,s){const m=add(new THREE.SphereGeometry(1,24,16),mat,parent);m.position.copy(p);m.scale.set(...s);return m;}
 function tube(parent,mat,points,r=.002){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*4),r,5,false),mat,parent);}
 const head=bones.head,eyes=[],restSurface=new THREE.Mesh(anatomySkin.geometry,skin),browMat=new THREE.MeshStandardMaterial({color:'#302820',roughness:.94,alphaToCoverage:true});
 browMat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vBrow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBrow=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vBrow;').replace('#include <color_fragment>',`#include <color_fragment>
   float across=abs(vBrow.y-.5)*2.;
   float strand=sin(vBrow.x*390.+vBrow.y*18.);
   float edge=1.-across*(1.+max(0.,strand)*.29);
   if(edge<.03)discard;
   diffuseColor.a*=smoothstep(.03,.33,edge)*smoothstep(0.,.06,vBrow.x)*(1.-smoothstep(.85,1.,vBrow.x));
   diffuseColor.rgb*=.74+.35*max(0.,strand);
  `);
 };browMat.customProgramCacheKey=()=> 'surface-eyebrow-strands-v1';
 function faceSurface(x,y,fallback=.14){const ray=new THREE.Raycaster(vec(x,y,.35),vec(0,0,-1),0,.4),hit=ray.intersectObject(restSurface,false)[0];return hit?hit.point.z+.0007:fallback;}
 for(const side of [-1,1]){
  const center=vec(side*.0327,1.6905,.1315).sub(bind.head);
  const white=oval(head,new THREE.MeshPhysicalMaterial({color:'#d5d0c6',roughness:.27,clearcoat:1}),center,[.0125,.006,.013]);
  const iris=oval(head,new THREE.MeshStandardMaterial({color:'#392c20',roughness:.3}),center.clone().add(vec(0,-.0002,.0121)),[.0048,.0049,.0015]);
  const pupil=oval(head,new THREE.MeshPhysicalMaterial({color:'#111512',roughness:.08,clearcoat:1}),center.clone().add(vec(0,-.0002,.0133)),[.0023,.0024,.0008]);
  const glint=oval(head,new THREE.MeshBasicMaterial({color:'#fff9ee'}),center.clone().add(vec(-.0018,.0021,.0149)),[.0008,.0008,.0006]);
  eyes.push({center,white,iris,pupil,glint});
  const browPosition=[],browUv=[],browIndex=[];
  for(let i=0;i<=24;i++)for(let j=0;j<=4;j++){
   const u=i/24,v=j/4,x=side*(.015+.041*u),centerY=1.712+Math.sin(u*Math.PI)*.004-u*.002;
   const width=(.0008+Math.sin(u*Math.PI)**.35*.00155)*(1-u*.47),y=centerY+(v-.5)*2*width;
   browPosition.push(...vec(x,y,faceSurface(x,y)).sub(bind.head).toArray());browUv.push(u,v);
   if(i<24&&j<4){const a=i*5+j,b=a+5;browIndex.push(...(side>0?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}
  }
  const browGeometry=new THREE.BufferGeometry();browGeometry.setAttribute('position',new THREE.Float32BufferAttribute(browPosition,3));browGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(browUv,2));browGeometry.setIndex(browIndex);browGeometry.computeVertexNormals();
  const eyebrow=add(browGeometry,browMat,head);eyebrow.name='Surface eyebrow';
  const lidMaterial=new THREE.MeshStandardMaterial({color:'#b58a74',roughness:.67});
  for(const lower of [false,true])tube(head,lidMaterial,Array.from({length:7},(_,i)=>center.clone().add(vec((i/6-.5)*.025,Math.sin(i/6*Math.PI)*(lower?-.0048:.0058),.007+Math.sin(i/6*Math.PI)*.0047))),.0012);
 }
 const shoes=[];
 for(const suffix of ['L','R']){
  const foot=bones['foot.'+suffix],g=createCourtShoe(THREE,{upper:new THREE.MeshPhysicalMaterial({color:'#e7ebe4',roughness:.84,bumpMap:weave,bumpScale:.00042}),sole:new THREE.MeshStandardMaterial({color:'#c6bda2',roughness:.9}),trim,lace:sock,mergeGeometries});foot.add(g);shoes.push(g);
 }
 for(const side of ['L','R']){const cuff=add(new THREE.CylinderGeometry(.031,.031,.045,20),sock,bones['wrist.'+side]);cuff.rotation.z=side==='L'?.65:-.65;cuff.position.set(0,.008,-.006);}
 const gripFrames={};
 for(const suffix of ['L','R']){const across=bind['finger2-1.'+suffix].clone().sub(bind['finger5-1.'+suffix]).normalize(),long=bind['finger3-1.'+suffix].clone().sub(bind['wrist.'+suffix]);long.addScaledVector(across,-long.dot(across)).normalize();const normal=long.clone().cross(across).normalize();gripFrames[suffix]={across,long,normal,orientation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(long,across,normal))};}
 const racket=createRacket();
 const gripCenter=bind['finger2-1.R'].clone().add(bind['finger5-1.R']).multiplyScalar(.5).sub(bind['wrist.R']).addScaledVector(gripFrames.R.normal,-.021);
 racket.position.copy(gripCenter).addScaledVector(gripFrames.R.across,-.085);bones['wrist.R'].add(racket);
 const crestCanvas=document.createElement('canvas');crestCanvas.width=256;crestCanvas.height=128;const ctx=crestCanvas.getContext('2d');ctx.fillStyle='#285e63';ctx.textAlign='center';ctx.font='700 42px sans-serif';ctx.fillText?.('FEATHER',128,56);ctx.font='22px sans-serif';ctx.fillText?.('PERFORMANCE / 07',128,94);
 const crestTex=new THREE.CanvasTexture(crestCanvas);crestTex.colorSpace=THREE.SRGBColorSpace;
 const crest=add(new THREE.PlaneGeometry(.13,.065),new THREE.MeshStandardMaterial({map:crestTex,transparent:true,roughness:.9,depthWrite:false}),bones.spine01);crest.position.copy(vec(-.064,1.366,.172).sub(bind.spine01));crest.rotation.y=-.12;
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d');
 if(sc.createRadialGradient){const gradient=sc.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'#0009');gradient.addColorStop(1,'#0000');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);}
 const shadowMap=new THREE.CanvasTexture(shadowCanvas),shadow=add(new THREE.PlaneGeometry(.95,.75),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.4,depthWrite:false}),root);shadow.rotation.x=-Math.PI/2;shadow.position.y=.009;shadow.castShadow=false;
 const soleShadows=['L','R'].map(()=>{const m=add(new THREE.PlaneGeometry(.22,.38),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.58,depthWrite:false}),root);m.rotation.x=-Math.PI/2;m.position.y=.01;m.castShadow=false;return m;});
 const parentQ=new THREE.Quaternion(),a=vec(),b=vec(),c=vec(),d=vec(),e=vec(),rest={};
 for(const name of ['upperarm01','upperleg01'])for(const s of ['L','R']){const upper=name+'.'+s,lower=(name==='upperarm01'?'lowerarm01':'lowerleg01')+'.'+s,end=(name==='upperarm01'?'wrist':'foot')+'.'+s;rest[upper]={lower,end,v1:bind[lower].clone().sub(bind[upper]),v2:bind[end].clone().sub(bind[lower])};}
 function limb(name,target,pole){
  const upper=bones[name],r=rest[name],lower=bones[r.lower];body.updateWorldMatrix(true,true);
  const origin=upper.getWorldPosition(a),end=root.localToWorld(target.clone()),direction=b.copy(end).sub(origin),L1=r.v1.length(),L2=r.v2.length(),distance=clamp(direction.length(),Math.abs(L1-L2)+.005,L1+L2-.003);direction.normalize();
  const poleWorld=root.localToWorld(pole.clone()).sub(origin),bend=c.copy(poleWorld).addScaledVector(direction,-poleWorld.dot(direction)).normalize();
  const along=(L1*L1+distance*distance-L2*L2)/(2*distance),height=Math.sqrt(Math.max(0,L1*L1-along*along)),joint=d.copy(origin).addScaledVector(direction,along).addScaledVector(bend,height);
  const v1=e.copy(joint).sub(origin).normalize();upper.parent.getWorldQuaternion(parentQ);v1.applyQuaternion(parentQ.invert());upper.quaternion.setFromUnitVectors(r.v1.clone().normalize(),v1);
  upper.updateWorldMatrix(true,true);const v2=end.sub(joint).normalize();upper.getWorldQuaternion(parentQ);v2.applyQuaternion(parentQ.invert());lower.quaternion.setFromUnitVectors(r.v2.clone().normalize(),v2);
 }
 let stride=0;const footPlants=[new FootPlant(),new FootPlant()];
 function update({speed=0,dt=1/60,time=0,swing=0,lateral=0,forward=0,shot='clear',anticipation=0,lookY=1.5,lookX=0,grip=1,split=0,crossover=false,contact=null,lunge=0,netVariant=''}={}){
  lunge=clamp(lunge,0,1);const netStroke=['net','netcross','push','netkill'].includes(shot),crossStep=crossover&&Math.abs(lateral)>.3;
  stride+=Math.min(dt,.05)*speed*4.1;const run=clamp(speed/4,0,1),motion=Math.sin(stride),t=clamp(swing/.55,0,1),stroke=swing>0?Math.sin(t*Math.PI):0;
  body.position.y=-.055-Math.abs(motion)*.018*run+Math.sin(time*2.2)*.002+anticipation*.009-Math.sin(split*Math.PI)*.032-lunge*.155;
  bones.spine05.rotation.x=.035+run*.055+anticipation*.018+lunge*.16;bones.spine03.rotation.x=.04+run*.018+lunge*.075;bones.spine01.rotation.x=-.025-stroke*.035;bones.spine01.rotation.y=stroke*(t<.25?-.23:.25)*(netStroke?.35:1);bones.spine01.rotation.z=0;bones.spine03.rotation.y=0;bones.spine03.rotation.z=clamp(-lateral*.021,-.13,.13);
  head.rotation.x=clamp((1.55-lookY)*.16,-.25,.25);head.rotation.y=clamp(lookX*.08,-.28,.28);root.updateWorldMatrix(true,true);
  const blinkPhase=(time+1.7)%4.6,blink=blinkPhase<.15?Math.sin(blinkPhase/.15*Math.PI):0;
  for(const eye of eyes){
   eye.white.scale.y=.006*(1-blink*.94);eye.iris.scale.y=.0049*(1-blink*.94);eye.pupil.scale.y=.0024*(1-blink*.94);
   const gazeX=clamp(lookX*.0006,-.002,.002),gazeY=clamp((lookY-1.55)*.0011,-.0015,.0015);
   for(const [part,offset] of [[eye.iris,0],[eye.pupil,0],[eye.glint,-.0018]]){part.position.x=eye.center.x+gazeX+offset;part.position.y=eye.center.y+gazeY+(part===eye.glint?.0021:-.0002);part.visible=blink<.8;}
  }
  const velocity=vec(lateral,0,forward);root.getWorldQuaternion(parentQ);velocity.applyQuaternion(parentQ.invert());if(velocity.lengthSq()<.01)velocity.set(0,0,1);velocity.normalize();
  for(let i=0;i<2;i++){
   const side=i?-1:1,suffix=i?'R':'L',cycle=((stride/(Math.PI*2)+i*.5)%1+1)%1,swingPhase=cycle<.5?0:(cycle-.5)*2,u=cycle<.5?cycle*2:swingPhase*swingPhase*(3-2*swingPhase),travel=(cycle<.5?.36-.72*u:-.36+.72*u)*run;
   const crossed=crossStep&&i===1,x=clamp(side*(.17+anticipation*.025+split*.035)+velocity.x*travel+(crossed?Math.sign(lateral)*.36:0),crossed?-.02:side<0?-.55:.02,crossed?.55:side<0?-.02:.55);
   const ideal=vec(x,.064+Math.sin(swingPhase*Math.PI)*.11*run,velocity.z*travel+.012);
   if(lunge>.03){footPlants[i].reset();ideal.lerp(vec(i?-.22:.19,.064,i?.55:-.29),lunge);}
   const planted=footPlants[i].sample(root.localToWorld(ideal.clone()).toArray(),cycle,speed>.45);
   const footTarget=root.worldToLocal(vec(...planted));
   limb('upperleg01.'+suffix,footTarget,vec(side*.17+velocity.x*.1,.48,.8));
   const foot=bones['foot.'+suffix];foot.parent.getWorldQuaternion(parentQ);const desired=new THREE.Quaternion();root.getWorldQuaternion(desired);foot.quaternion.copy(parentQ.invert().multiply(desired));
   const localFoot=root.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));soleShadows[i].position.set(localFoot.x,.01,localFoot.z+.055);soleShadows[i].material.opacity=.58*(1-clamp((localFoot.y-.064)/.13,0,.9));
  }
  const overhead=['smash','slicesmash','clear','drop','slicedrop'].includes(shot),under=shot==='lift'||shot==='serve';let hand=vec(-.24,1.24,.28),pole=vec(-.47,1.08,-.02);
  if(swing>0){if(overhead){if(t<.25){const u=t/.25;hand.set(-.28-u*.03,1.27+u*.43,.16-u*.3);}else{const u=(t-.25)/.75;hand.set(-.30+u*.47,1.72-u*.66,-.14+Math.sin(u*Math.PI)*.5);}}else if(under){hand.set(-.27+stroke*.35,1.13-stroke*.32,.22+stroke*.3);pole.set(-.7,.95,.05);}else hand.set(-.29+stroke*.45,1.29+stroke*.08,.22+stroke*.32);}else{hand.y+=anticipation*.19;hand.x-=run*.025+motion*run*.025;hand.z+=Math.cos(stride)*run*.055;}
  if(['slicesmash','slicedrop'].includes(shot)&&swing>0){bones.spine03.rotation.y+=stroke*.22;hand.x-=stroke*.13;pole.x-=stroke*.10;}
  let netWristRoll=0;
  if(netStroke){
   const cross=netVariant.includes('对角'),backhand=netVariant.includes('反手'),push=netVariant.includes('推')||netVariant.includes('扑'),brush=netVariant.includes('搓');
   const brushSnap=brush?Math.sin(t*Math.PI*2):0,crossReach=cross?.24:0,attackDrive=push?.46:.13;
   // Each net technique has its own striking lane. The shoulder opens for a
   // cross-court brush, while a straight net shot keeps the racket quiet and
   // the push/net kill drives through the shuttle.
   bones.spine03.rotation.y+=stroke*(backhand?-.15:cross?.19:.025);
   bones.spine01.rotation.z+=stroke*(backhand?.08:cross?.045:0)-lunge*.035;
   hand.set((backhand?.12:-.25)+stroke*(backhand?-.24:.09+crossReach)+brushSnap*(brush?.085:0),.99-lunge*.08+stroke*.08,.40+lunge*.12+stroke*attackDrive);
   pole.set(backhand?.42:cross?-.28:-.56,.76,.08);
   netWristRoll=brush?brushSnap*.3:cross?stroke*.13:push?-stroke*.09:0;
  }
  const racketY=netStroke?vec(-.06+stroke*(netVariant.includes('反手')?-.2:netVariant.includes('对角')?.27:netVariant.includes('推')?.32:netVariant.includes('搓')?.04:.14),.29+stroke*(netVariant.includes('扑')?.2:netVariant.includes('推')?.27:netVariant.includes('搓')?-.035:.09),.96).normalize():vec(-.08+stroke*.35,.86-stroke*.1,.30+stroke*.18).normalize(),handX=vec(-1,0,.2);handX.addScaledVector(racketY,-handX.dot(racketY)).normalize();
  const handZ=handX.clone().cross(racketY).normalize(),worldWrist=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(handX,racketY,handZ)).multiply(gripFrames.R.orientation.clone().invert());
  if(netWristRoll)worldWrist.multiply(new THREE.Quaternion().setFromAxisAngle(vec(0,1,0),netWristRoll));
  if(contact&&swing>0){
   const headOffset=racket.position.clone().applyQuaternion(worldWrist).addScaledVector(racketY,.51);
   const goal=vec(...contact).sub(headOffset),weight=clamp(1-Math.abs(swing-.135)/.135,0,1);
   hand.lerp(goal,weight*weight*(3-2*weight));pole.set(hand.x<0?-.65:.3,netStroke?.76:1.25,netStroke?.05:-.12);
  }
  limb('upperarm01.R',hand,pole);limb('upperarm01.L',vec(.23+stroke*.15-motion*run*.105,1.07+stroke*.29-Math.abs(motion)*run*.018,.16+stroke*.06+Math.cos(stride)*run*.045-lunge*.28),vec(.28,.8,.04));
  root.getWorldQuaternion(parentQ);worldWrist.premultiply(parentQ);bones['wrist.R'].parent.getWorldQuaternion(parentQ);bones['wrist.R'].quaternion.copy(parentQ.invert().multiply(worldWrist));bones['wrist.L'].rotation.set(-.1,0,.12);
  bones['wrist.R'].updateWorldMatrix(true,false);const orientation=new THREE.Quaternion().setFromUnitVectors(vec(0,1,0),racketY);root.getWorldQuaternion(parentQ);orientation.premultiply(parentQ);bones['wrist.R'].getWorldQuaternion(parentQ);racket.quaternion.copy(parentQ.invert().multiply(orientation));
  for(const suffix of ['L','R']){
   const amount=suffix==='R'?grip:.30,sign=suffix==='R'?1:-1,frame=gripFrames[suffix];
   for(let f=2;f<=5;f++)for(let part=1;part<=3;part++)bones['finger'+f+'-'+part+'.'+suffix].quaternion.setFromAxisAngle(frame.across,sign*amount*(part===1?1.04:part===2?1.22:.86));
   // Oppose the thumb against the index finger instead of pointing it upward.
   const thumb1=bones['finger1-1.'+suffix],thumb2=bones['finger1-2.'+suffix],thumb3=bones['finger1-3.'+suffix];
   const rest1=bind['finger1-2.'+suffix].clone().sub(bind['finger1-1.'+suffix]);
   const direction1=vec(.66,.20,-sign*.72).normalize().applyQuaternion(frame.orientation);
   const q1=new THREE.Quaternion().setFromUnitVectors(rest1.normalize(),direction1);thumb1.quaternion.identity().slerp(q1,amount);
   const rest2=bind['finger1-3.'+suffix].clone().sub(bind['finger1-2.'+suffix]);
   const direction2=vec(.72,-.22,-sign*.66).normalize().applyQuaternion(frame.orientation).applyQuaternion(thumb1.quaternion.clone().invert());
   thumb2.quaternion.identity().slerp(new THREE.Quaternion().setFromUnitVectors(rest2.normalize(),direction2),amount);thumb3.quaternion.setFromAxisAngle(frame.across,sign*.35*amount);
  }
  skeleton.update();
 }
 const kits={allround:['#e3e9df','#1c343c','#378683'],linDan08:['#c63b38','#1b2630','#d9bb68'],leeChongWei:['#e6c550','#172738','#d8e7ee'],chenLong:['#dfe8ed','#203344','#607e9d'],taufik:['#dce6d2','#243c31','#b48c56']};
 function setKit(key='allround'){const [shirt,pants,accent]=kits[key]||kits.allround;jersey.color.set(shirt);shorts.color.set(pants);trim.color.set(accent);root.userData.kit=key;}
 update();return {root,body,torso,head,legs:[bones['upperleg01.L'],bones['upperleg01.R']],knees:[bones['lowerleg01.L'],bones['lowerleg01.R']],arms:[bones['upperarm01.L'],bones['upperarm01.R']],elbows:[bones['lowerarm01.L'],bones['lowerarm01.R']],wrists:[bones['wrist.L'],bones['wrist.R']],skeleton,meshes,bones,bind,shoes,racket,update,setKit};
}

