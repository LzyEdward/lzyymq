import {matchKit,hairCutOffset} from './match-kit.mjs';
import * as data from './assets/athlete-data.mjs';
import {FootPlant} from './footwork.mjs';
import {createCourtShoe} from './court-shoe.mjs';
import {necklineDistances} from './garment-surfaces.mjs';
import {shortHairProfile,HAIRLINE_GLSL} from './hair-surface.mjs';
import {createPortraitHead,createPortraitNeck} from './portrait-head.mjs';
import {gripRig,fitCourtGrip,smoothCourtHands} from './grip-rig.mjs';
import {schoolPolo,schoolTrousers,extendTrackPants} from './school-uniform.mjs';

// A continuous CC0 anatomical mesh, 48-bone skin, and two-bone limb IK.
export function createAthlete(THREE, createRacket,{skinMap=null,mergeGeometries=null,portraitMap=null,uniformMap=null}={}) {
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
 const printCanvas=document.createElement('canvas');printCanvas.width=512;printCanvas.height=256;
 const printContext=printCanvas.getContext('2d'),printMap=new THREE.CanvasTexture(printCanvas);
 printMap.colorSpace=THREE.SRGBColorSpace;printMap.anisotropy=4;
 const printPattern={value:0},sleeveTone={value:new THREE.Color()};
 jersey.onBeforeCompile=shader=>{
  shader.uniforms.uCollarColor={value:trim.color};shader.uniforms.uKitPattern=printPattern;shader.uniforms.uSleeve=sleeveTone;shader.uniforms.uBackPrint={value:printMap};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;\nattribute float necklineDistance;\nvarying float vNeckline;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCloth=position;\nvNeckline=necklineDistance;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;\nvarying float vNeckline;\nuniform vec3 uCollarColor;\nuniform float uKitPattern;\nuniform vec3 uSleeve;\nuniform sampler2D uBackPrint;').replace('#include <color_fragment>',`#include <color_fragment>
   float panel=smoothstep(.163,.195,abs(vCloth.x))*(1.-smoothstep(1.25,1.34,vCloth.y))*smoothstep(.99,1.045,vCloth.y);
   float hem=1.-smoothstep(.003,.010,abs(vCloth.y-.992));
   float cuff=smoothstep(.22,.25,abs(vCloth.x))*(1.-smoothstep(.002,.008,abs(vCloth.y-1.316)));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.15,.155),panel*.83+hem*.45+cuff*.8);
   float raglan=smoothstep(.134,.142,abs(vCloth.x)-(1.43-vCloth.y)*.32);
   float front=smoothstep(.012,.085,vCloth.z);
   float chest=smoothstep(1.05,1.12,vCloth.y)*(1.-smoothstep(1.35,1.40,vCloth.y));
   float slant=vCloth.y+vCloth.x*.48;
   float ribbon=1.-smoothstep(.021,.026,abs(slant-1.29));
   float chevron=1.-smoothstep(.025,.03,abs(vCloth.y-abs(vCloth.x)*.64-1.25));
   float motif=uKitPattern<.5?ribbon:uKitPattern<1.5?raglan:uKitPattern<2.5?1.-smoothstep(1.05,1.32,vCloth.y):chevron;
   diffuseColor.rgb=mix(diffuseColor.rgb,uCollarColor,motif*(.28+.54*front));
   if(abs(uKitPattern-1.)<.1)diffuseColor.rgb=mix(diffuseColor.rgb,uSleeve,raglan*.96);
   float bladePos=slant+abs(vCloth.x+.09)*.65;
   float bars=1.-smoothstep(.003,.005,abs(mod(bladePos,.024)-.012));
   float graphic=chest*front*smoothstep(-.095,.06,vCloth.x)*bars;
   diffuseColor.rgb=mix(diffuseColor.rgb,uCollarColor,graphic*(.30+.26*front));
   float stripe=1.-smoothstep(.002,.004,abs(slant-1.246));
   diffuseColor.rgb=mix(diffuseColor.rgb,uCollarColor,stripe*.77*front);
   vec2 printUv=vec2(.5-vCloth.x/.32,(vCloth.y-1.24)/.145);
   if(vCloth.z<-.035&&all(greaterThanEqual(printUv,vec2(0.)))&&all(lessThanEqual(printUv,vec2(1.)))){
    vec4 ink=texture2D(uBackPrint,printUv);diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a);
   }
   vec2 chestUv=vec2(.5+(vCloth.x+.081)/.079,(vCloth.y-1.336)/.082);
   if(front>.65&&all(greaterThanEqual(chestUv,vec2(0.)))&&all(lessThanEqual(chestUv,vec2(1.)))){
    vec4 ink=texture2D(uBackPrint,chestUv);diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a);
   }
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
 jersey.customProgramCacheKey=()=> 'match-jersey-print-v6';
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
 let skinIndices=data.indices0;
 if(portraitMap){
  skinIndices=[];
  for(let i=0;i<data.indices0.length;i+=3){
   const triangle=data.indices0.slice(i,i+3);
   if(triangle.some(id=>data.positions[id*3+1]<1.48)&&(!uniformMap||triangle.some(id=>data.positions[id*3+1]>.68)))skinIndices.push(...triangle);
  }
 }
 const torso=skinMesh(data.indices1,uniformMap?schoolPolo(THREE,uniformMap,weave):jersey),anatomySkin=skinMesh(skinIndices,skin);
 const bottoms=skinMesh(data.indices2,uniformMap?schoolTrousers(THREE,weave):shorts);
 if(uniformMap){
  bottoms.geometry.userData.joints=Object.fromEntries(data.bones.map((bone,i)=>[bone.name,i]));
  extendTrackPants(THREE,bottoms.geometry);
 }else skinMesh(data.indices3,sock);
 torso.geometry.setAttribute('necklineDistance',new THREE.Float32BufferAttribute(necklineDistances(data.positions,data.indices1).distances,1));
 // Cloth bridges the small anatomical hollows instead of painting a shirt
 // directly on the chest. Keep shoulder and sleeve seams in the original rig.
 const cloth=torso.geometry.attributes.position;
 for(const i of new Set(data.indices1)){
  const x=cloth.getX(i),y=cloth.getY(i),z=cloth.getZ(i),edge=1-THREE.MathUtils.smoothstep(Math.abs(x),.135,.225);
  const middle=THREE.MathUtils.smoothstep(y,.985,1.05)*(1-THREE.MathUtils.smoothstep(y,1.43,1.49))*edge;
  const curve=Math.sqrt(Math.max(.05,1-(x/.202)**2));
  const front=(.121+Math.exp(-Math.pow((y-1.34)/.115,2))*.041)*curve+.009;
  const envelope=z>0?Math.max(z,front):Math.min(z,-.118*curve);
  const folds=(Math.sin(y*95+x*16)*.0017+Math.sin(x*82+y*22)*.0011)*(1-THREE.MathUtils.smoothstep(y,1.24,1.41));
  cloth.setZ(i,z+(envelope-z)*middle+folds*middle*(z>0?1:-1));
  const skirt=(1-THREE.MathUtils.smoothstep(y,.985,1.08))*THREE.MathUtils.smoothstep(.23-Math.abs(x),0,.055);
  cloth.setY(i,y-skirt*.019);
  if(uniformMap&&y<1.32){
   const ease=1-THREE.MathUtils.smoothstep(y,1.10,1.32);
   cloth.setX(i,x*(1+.085*ease));
   cloth.setZ(i,cloth.getZ(i)*(1+.14*ease));
   cloth.setY(i,cloth.getY(i)-.025*ease);
  }
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
 const head=bones.head,eyes=[],faceTints=[];
 function add(geo,mat,parent=body){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const adjustHair=portraitMap?null:createStandardHead();
 if(portraitMap){
  head.add(createPortraitHead(THREE,portraitMap,bind.head));
  const neck=createPortraitNeck(THREE,torso,skeleton.bones.indexOf(bones.neck01),skeleton.bones.indexOf(head));
  body.add(neck);neck.bind(skeleton);neck.frustumCulled=false;neck.castShadow=true;meshes.push(neck);
 }
 function createStandardHead(){
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
 function oval(parent,mat,p,s){const m=add(new THREE.SphereGeometry(1,24,16),mat,parent);m.position.copy(p);m.scale.set(...s);return m;}
 function tube(parent,mat,points,r=.002){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*4),r,5,false),mat,parent);}
 const restSurface=new THREE.Mesh(anatomySkin.geometry,skin),browMat=new THREE.MeshStandardMaterial({color:'#302820',roughness:.94,alphaToCoverage:true});
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
  faceTints.push([lidMaterial,'#b58a74']);
  for(const lower of [false,true])tube(head,lidMaterial,Array.from({length:7},(_,i)=>center.clone().add(vec((i/6-.5)*.025,Math.sin(i/6*Math.PI)*(lower?-.0048:.0058),.007+Math.sin(i/6*Math.PI)*.0047))),.0012);
 }
 // Small facial planes break the game-like sphere silhouette at match distance:
 // ears sit on the head seam and the nose bridge catches a soft highlight.
 const earMat=new THREE.MeshPhysicalMaterial({color:'#b98572',roughness:.74,sheen:.12}),noseMat=new THREE.MeshPhysicalMaterial({color:'#bd8b76',roughness:.7,sheen:.12});
 faceTints.push([earMat,'#b98572'],[noseMat,'#bd8b76']);
 for(const side of [-1,1]){
  oval(head,earMat,vec(side*.061,1.688,.109).sub(bind.head),[.008,.018,.007]);
  oval(head,earMat,vec(side*.061,1.688,.116).sub(bind.head),[.004,.010,.003]);
 }
 oval(head,noseMat,vec(0,1.675,.147).sub(bind.head),[.009,.014,.014]);
 const nostrilMat=new THREE.MeshBasicMaterial({color:'#6e4038'});
 for(const side of [-1,1])oval(head,nostrilMat,vec(side*.0038,1.671,.158).sub(bind.head),[.0018,.0014,.001]);
 const scalpRest=sp.array.slice(),tufts=tuftGeometry.attributes.position,tuftRest=tufts.array.slice();
 const scalpIds=[...new Set(scalp)];
 return cut=>{
  const reshape=(attr,original,i,origin)=>{
   const j=i*3,x=original[j],y=original[j+1],z=original[j+2];
   const d=hairCutOffset(cut,x+origin.x,y+origin.y,z+origin.z);
   attr.setXYZ(i,x+d[0],y+d[1],z+d[2]);
  };
  const zero=vec();for(const i of scalpIds)reshape(sp,scalpRest,i,zero);
  for(let i=0;i<tufts.count;i++)reshape(tufts,tuftRest,i,bind.head);
  sp.needsUpdate=tufts.needsUpdate=true;tuftGeometry.computeBoundingSphere();
 };
 }
 const shoes=[];
 for(const suffix of ['L','R']){
  const foot=bones['foot.'+suffix],g=createCourtShoe(THREE,{upper:new THREE.MeshPhysicalMaterial({color:'#e7ebe4',roughness:.84,bumpMap:weave,bumpScale:.00042}),sole:new THREE.MeshStandardMaterial({color:'#c6bda2',roughness:.9}),trim,lace:sock,mergeGeometries});foot.add(g);shoes.push(g);
 }
 const bandColors=[new THREE.Color('#a1c5bd'),new THREE.Color('#a1c5bd')];
 const bandStrength={value:new THREE.Vector2(1,1)};
 skin.onBeforeCompile=shader=>{
  shader.uniforms.bandLeft={value:bandColors[0]};shader.uniforms.bandRight={value:bandColors[1]};shader.uniforms.bandStrength=bandStrength;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSkinRest;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvSkinRest=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSkinRest;\nuniform vec3 bandLeft,bandRight; uniform vec2 bandStrength;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 arm=vec3(abs(vSkinRest.x)-.509,vSkinRest.y-1.0983,vSkinRest.z-.2044);
    float axial=dot(arm,normalize(vec3(-.139,.131,-.196)));
    float band=(1.-smoothstep(.014,.015,abs(axial-.045)))*(1.-smoothstep(.072,.08,length(arm)));
    float thread=1.-smoothstep(.15,.85,abs(sin(axial*2900.)));
    float sheen=.93+.045*thread*(1.-smoothstep(.0003,.0015,fwidth(axial)));
    diffuseColor.rgb=mix(diffuseColor.rgb,(vSkinRest.x>0.?bandLeft:bandRight)*sheen,band*(vSkinRest.x>0.?bandStrength.x:bandStrength.y));`);
 };
 const setWristband=(side,visible,color)=>{bandColors[side].set(color);bandStrength.value.setComponent(side,visible?1:0);};
 const gripFrames={};
 for(const suffix of ['L','R']){const across=bind['finger2-1.'+suffix].clone().sub(bind['finger5-1.'+suffix]).normalize(),long=bind['finger3-1.'+suffix].clone().sub(bind['wrist.'+suffix]);long.addScaledVector(across,-long.dot(across)).normalize();const normal=long.clone().cross(across).normalize();gripFrames[suffix]={across,long,normal,orientation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(long,across,normal))};}
 const racket=createRacket();
 const bindMap=new Map(Object.entries(bind)),boneNames=data.bones.map(b=>b.name);
 const gripPose=gripRig(THREE,bindMap);
 fitCourtGrip(THREE,anatomySkin.geometry,boneNames,bindMap,gripPose);
 smoothCourtHands(THREE,anatomySkin.geometry,boneNames);
 racket.position.copy(gripPose.offset);racket.quaternion.copy(gripPose.toBind);bones['wrist.R'].add(racket);
 const gripInverse=gripPose.toBind.clone().invert();
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
  upper.updateWorldMatrix(true,true);const v2=end.copy(origin).addScaledVector(direction,distance).sub(joint).normalize();upper.getWorldQuaternion(parentQ);v2.applyQuaternion(parentQ.invert());lower.quaternion.setFromUnitVectors(r.v2.clone().normalize(),v2);
 }
 let stride=0,ready=0,carriedX=0,carriedZ=0;const footPlants=[new FootPlant(),new FootPlant()];
 const smooth=(t,lo,hi)=>{const u=clamp((t-lo)/(hi-lo),0,1);return u*u*(3-2*u);};
 function update({speed=0,dt=1/60,time=0,swing=0,lateral=0,forward=0,shot='clear',anticipation=0,lookY=1.5,lookX=0,split=0,crossover=false,contact=null,lunge=0,netVariant='',supportContact=null,jumpHeight=0,landing=0,celebration=0,fist=0,overheadReady=0,overheadTurn=0,impactOnly=false}={}){
  // The callers supply court-space velocity. Lean, crossover and feet
  // must all use the same body frame, including when facing the far baseline.
  const velocity=vec(lateral,0,forward);
  root.getWorldQuaternion(parentQ);velocity.applyQuaternion(parentQ.invert());
  lateral=velocity.x;forward=velocity.z;
  const transfer=1-Math.exp(-9*dt);
  carriedX+=(lateral-carriedX)*transfer;carriedZ+=(forward-carriedZ)*transfer;
  const loadX=clamp((lateral-carriedX)*.055,-.14,.14),loadZ=clamp((forward-carriedZ)*.05,-.12,.12);
  const splitLoad=Math.sin(clamp(split,0,1)*Math.PI);
  lunge=clamp(lunge,0,1);const netStroke=['net','netcross','push','netkill'].includes(shot),crossStep=crossover&&Math.abs(lateral)>.3;
  const overhead=['smash','slicesmash','clear','drop','slicedrop'].includes(shot),under=shot==='lift'||shot==='serve';
  const power=shot==='smash'?1:shot==='slicesmash'?.83:shot==='clear'?.72:.48;
  stride+=Math.min(dt,.05)*speed*4.1;
  ready+=(anticipation-ready)*(1-Math.exp(-15*dt));
  const run=clamp(speed/4,0,1),motion=Math.sin(stride),t=clamp(swing/.55,0,1),stroke=Math.sin(t*Math.PI);
  const coil=smooth(t,0,.055)*(1-smooth(t,.19,.255)),drive=smooth(t,.14,.245)*(1-smooth(t,.30,.58));
  const hips=smooth(t,.06,.19)*(1-smooth(t,.30,.72)),air=clamp(jumpHeight/.46,0,1);
  const racketPower=shot==='smash'?1:shot==='slicesmash'?.82:shot==='clear'?.26:.48;
  body.position.y=-.055-Math.abs(motion)*.022*run+Math.sin(time*2.2)*.002-ready*.035-splitLoad*.052-lunge*.145-landing*.064;
  body.position.y+=.048*celebration;
  const waiting=(1-smooth(speed,0,.85))*(1-air)*(1-landing)*(1-celebration)*(1-fist)*(1-lunge)*(1-splitLoad)*(1-overheadReady);
  const readySway=swing===0&&!supportContact?Math.sin(time*2.1+stride)*waiting:0;
  const weightShift=run*Math.sin(stride),breath=Math.sin(time*2.65)*(1-run*.65);
  const impact=contact&&swing>0?1-smooth(Math.abs(swing-.135),.012,.135):0;
  const dip=impact*clamp((1.29-(contact?.[1]??1.29))*.54,0,.46);
  const reachSide=impact*clamp((contact?.[0]??0)+.15,-.95,.95);
  body.position.x=.018*readySway+.034*weightShift+reachSide*.11+loadX*.22;body.position.y-=dip;
  body.position.z=impact*clamp((contact?.[2]??0)*.16,-.07,.15);
  bones.root.rotation.y=weightShift*.095+clamp(lateral*.035,-.19,.19)*run+hips*(overhead?.16:.075);
  bones.root.rotation.z=-weightShift*.04-reachSide*.07-loadX*.40;
  bones.spine05.rotation.x=.035+run*.075+ready*.075+lunge*.16+landing*.075+splitLoad*.08+loadZ;
  bones.spine05.rotation.y=overhead?power*(-coil*.18+hips*.27):0;
  bones.spine03.rotation.x=.04+run*.03+lunge*.075+(overhead?power*(-coil*.09+drive*.20):0);
  bones.spine01.rotation.x=-.025-stroke*.035;
  bones.spine01.rotation.y=overhead?power*(-coil*.44+drive*.54):stroke*(netStroke?.06:.16);
  bones.spine01.rotation.z=overhead?power*(coil*.13-drive*.16):0;
  bones.spine05.rotation.x+=dip*.35+breath*.009;
  bones.spine03.rotation.y=weightShift*-.092+(overhead?power*(-coil*.15+drive*.19):impact*.105);
  bones.spine03.rotation.z=clamp(-lateral*.018,-.10,.10)-loadX*.55-reachSide*.17+weightShift*.035;
  bones.spine01.rotation.x+=breath*.014+dip*.16;
  bones.spine03.rotation.z-=readySway*.018;
  bones.spine01.rotation.y+=readySway*.033;
  bones.spine03.rotation.y-=overheadTurn*.32+overheadReady*.12;
  head.rotation.x=clamp((1.55-lookY)*.20,-.58,.32);head.rotation.y=clamp(lookX*.11,-.36,.36);root.updateWorldMatrix(true,true);
  const blinkPhase=(time+1.7)%4.6,blink=blinkPhase<.15?Math.sin(blinkPhase/.15*Math.PI):0;
  if(!impactOnly)for(const eye of eyes){
   eye.white.scale.y=.006*(1-blink*.94);eye.iris.scale.y=.0049*(1-blink*.94);eye.pupil.scale.y=.0024*(1-blink*.94);
   const gazeX=clamp(lookX*.0006,-.002,.002),gazeY=clamp((lookY-1.55)*.0011,-.0015,.0015);
   for(const [part,offset] of [[eye.iris,0],[eye.pupil,0],[eye.glint,-.0018]]){part.position.x=eye.center.x+gazeX+offset;part.position.y=eye.center.y+gazeY+(part===eye.glint?.0021:-.0002);part.visible=blink<.8;}
  }
  if(velocity.lengthSq()<.01)velocity.set(0,0,1);velocity.normalize();
  if(!impactOnly)for(let i=0;i<2;i++){
   const side=i?-1:1,suffix=i?'R':'L',cycle=((stride/(Math.PI*2)+i*.5)%1+1)%1,swingPhase=cycle<.5?0:(cycle-.5)*2,u=cycle<.5?cycle*2:swingPhase*swingPhase*(3-2*swingPhase),travel=(cycle<.5?.36-.72*u:-.36+.72*u)*run;
   const crossed=crossStep&&i===(lateral>0?1:0),x=clamp(side*(.17+anticipation*.025+splitLoad*.038)+velocity.x*travel+(crossed?Math.sign(lateral)*.36:0),crossed?(lateral>0?-.02:-.55):side<0?-.55:.02,crossed?(lateral>0?.55:.02):side<0?-.02:.55);
   const ideal=vec(x,.064+Math.sin(swingPhase*Math.PI)*.13*run,velocity.z*travel+.012+side*(ready*.06+coil*.18-drive*.11));
   if(lunge>.03)ideal.lerp(vec(i?-.22:.19,.064,i?.55:-.29),lunge);
   if(jumpHeight>0){
    footPlants[i].reset();
    ideal.lerp(vec(side*.21,.064,side*(.22-drive*.34)-.08),air);
   }
   const planted=footPlants[i].sample(root.localToWorld(ideal.clone()).toArray(),cycle,speed>.45&&jumpHeight===0,lunge>.03);
   const footTarget=root.worldToLocal(vec(...planted));
   limb('upperleg01.'+suffix,footTarget,vec(side*.17+velocity.x*.1,.48,.8));
   const foot=bones['foot.'+suffix];foot.parent.getWorldQuaternion(parentQ);const desired=new THREE.Quaternion();root.getWorldQuaternion(desired);foot.quaternion.copy(parentQ.invert().multiply(desired));
   const localFoot=root.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));soleShadows[i].position.set(localFoot.x,.01-jumpHeight,localFoot.z+.055);soleShadows[i].material.opacity=.58*(1-clamp((localFoot.y-.064)/.13,0,.9));
  }
  shadow.position.y=.009-jumpHeight;shadow.material.opacity=.4/(1+jumpHeight);
  const hand=vec(-.24-run*.035-motion*run*.035,1.24+ready*.19,.28+Math.cos(stride)*run*.07);
  const pole=vec(-.47,1.08,-.02);
  hand.y+=.28*overheadReady;hand.z-=.22*overheadReady+.10*overheadTurn;
  pole.y+=.24*overheadReady;
  if(overhead){
   const load=smooth(t,0,.14),extend=smooth(t,.13,.245),follow=smooth(t,.255,.53),recover=smooth(t,.55,1);
   const swingHand=vec(-.32,1.63,-.27).lerp(vec(-.28,1.86,.16),extend)
    .lerp(vec(power*.42-.12,1.29-power*.27,.36),follow);
   hand.lerp(swingHand,load*(1-recover));
   pole.lerp(vec(-.63+drive*.23,1.48+extend*.15,-.18+follow*.28),load*(1-recover));
  }else if(under){
   hand.lerp(vec(-.27+stroke*.35,1.13-stroke*.32,.22+stroke*.30),stroke);pole.lerp(vec(-.7,.95,.05),stroke);
  }else{
   hand.lerp(vec(-.29+stroke*.45,1.29+stroke*.08,.22+stroke*.32),stroke);
  }
  if(['slicesmash','slicedrop'].includes(shot)&&swing>0){bones.spine03.rotation.y+=stroke*.22;hand.x-=stroke*.13;pole.x-=stroke*.10;}
  let netWristRoll=0;
  const backhand=contact&&Math.abs(contact[0])>.16?contact[0]>0:netVariant.includes('反手');
  const cross=shot==='netcross'||netVariant.includes('对角'),push=shot==='push'||shot==='netkill'||netVariant.includes('推')||netVariant.includes('扑'),brush=shot==='net'&&netVariant.includes('搓');
  if(netStroke&&swing>0){
   const handSide=backhand?-1:1;
   const brushSnap=brush?Math.sin(t*Math.PI*2):0,crossReach=cross?.20*handSide:0,attackDrive=push?.36:.13;
   const turn=smooth(swing,.082,.147)*(1-smooth(swing,.18,.30));
   // Each net technique has its own striking lane. The shoulder opens for a
   // cross-court brush, while a straight net shot keeps the racket quiet and
   // the push/net kill drives through the shuttle.
   bones.spine03.rotation.y+=stroke*(backhand?-.15:cross?.19:.025);
   bones.spine01.rotation.z+=stroke*(backhand?.08:cross?.045:0)-lunge*.035;
   const reach=smooth(t,0,.13)*(1-smooth(t,.53,1));
   hand.lerp(vec((backhand?.12:-.25)+stroke*((backhand?-.18:.09)+crossReach)+brushSnap*(brush?.085:0),.99-lunge*.08+stroke*.08,.40+lunge*.12+stroke*attackDrive),reach);
   pole.lerp(vec(backhand?.42:cross?-.28:-.56,.76,.08),reach);
   netWristRoll=handSide*(cross?turn*.39:brush?brushSnap*.26:push?-stroke*.09:0);
  }
  const racketY=vec(-.08,.86,.30);
  if(netStroke){
   racketY.lerp(vec(-.06+stroke*(backhand?-1:1)*(cross?.27:push?.32:brush?.04:.14),.29+stroke*(shot==='netkill'?.2:push?.27:brush?-.035:.09),.96),smooth(t,0,.15)*(1-smooth(t,.58,1)));
  }else if(overhead){
   racketY.add(vec(-coil*.38+drive*.94*racketPower,-drive*1.06*racketPower,-coil*.72+drive*.57*racketPower));
  }
  if(impact){
   const shoulder=root.worldToLocal(bones['upperarm01.R'].getWorldPosition(vec()));
   const aim=vec(...contact).sub(shoulder),extension=smooth(aim.length(),.40,.98);
   racketY.normalize().lerp(aim.normalize(),impact*(.45+.55*extension));
  }
  racketY.normalize();const handX=vec(-1,0,.2);handX.addScaledVector(racketY,-handX.dot(racketY)).normalize();
  handX.negate();const handZ=handX.clone().cross(racketY).normalize();
  const worldWrist=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(handX,racketY,handZ));
  if(netWristRoll)worldWrist.multiply(new THREE.Quaternion().setFromAxisAngle(vec(0,1,0),netWristRoll));
  worldWrist.multiply(gripInverse);
  if(contact&&swing>0){
   const headOffset=racket.position.clone().applyQuaternion(worldWrist).addScaledVector(racketY,.51);
   const goal=vec(...contact).sub(headOffset),weight=clamp(1-Math.abs(swing-.135)/.135,0,1);
   hand.lerp(goal,weight*weight*(3-2*weight));pole.lerp(vec(clamp(hand.x*1.15-.23,-.69,.30),netStroke?.76:1.25,netStroke?.05:-.12),weight);
  }
  limb('upperarm01.R',hand,pole);
  // Roll the grip along the forearm through preparation and recovery. During
  // the contact solve, keep the already fitted sweet spot on the shuttle.
  const armEnd=root.worldToLocal(bones['wrist.R'].getWorldPosition(vec()));
  const elbowPoint=root.worldToLocal(bones['lowerarm01.R'].getWorldPosition(vec()));
  const along=armEnd.sub(elbowPoint).normalize();
  along.addScaledVector(racketY,-along.dot(racketY));
  const palm=bind['finger3-1.R'].clone().sub(bind['wrist.R']).applyQuaternion(worldWrist);
  palm.addScaledVector(racketY,-palm.dot(racketY)).normalize();
  const twist=Math.atan2(racketY.dot(palm.clone().cross(along)),palm.dot(along));
  const roll=twist*smooth(along.length(),.05,.24)*(1-impact);
  worldWrist.premultiply(new THREE.Quaternion().setFromAxisAngle(racketY,roll));
  if(!impactOnly)limb('upperarm01.L',vec(.23+stroke*.15-motion*run*.105+drive*.19,1.07+ready*.19+coil*.41+stroke*.12-drive*.17,.16+coil*.31-drive*.25+Math.cos(stride)*run*.045-lunge*.28),vec(.38,.8,.04));
  root.getWorldQuaternion(parentQ);worldWrist.premultiply(parentQ);bones['wrist.R'].parent.getWorldQuaternion(parentQ);bones['wrist.R'].quaternion.copy(parentQ.invert().multiply(worldWrist));bones['wrist.L'].rotation.set(-.1,0,.12);
  if(celebration&&!impactOnly){
   const left=root.worldToLocal(bones['wrist.L'].getWorldPosition(vec()));
   const beat=Math.sin(time*9);
   limb('upperarm01.L',left.lerp(vec(.30+.08*beat,1.91,.12),celebration),vec(.61,1.54,.02));
   bones['wrist.L'].rotation.z+=celebration*(.45+.34*beat);
  }
  if(fist&&!impactOnly){
   const left=root.worldToLocal(bones['wrist.L'].getWorldPosition(vec()));
   limb('upperarm01.L',left.lerp(vec(.26,1.44,.24),fist),vec(.49,.94,.04));
  }
  if(supportContact){const held=vec(...supportContact);held.x+=.015;held.y-=.09;limb('upperarm01.L',held,vec(.5,.7,.2));}
  bones['wrist.R'].updateWorldMatrix(true,false);
  if(impactOnly)return;
  {
   const suffix='L',amount=supportContact ? .33 : .20*(1-celebration)+fist*.78,sign=-1,frame=gripFrames.L;
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
 let currentCut='';
 function setKit(input='custom'){
  const kit=matchKit(input);if(root.userData.kit===kit.key)return;
  jersey.color.set(kit.shirt);shorts.color.set(kit.pants);trim.color.set(kit.accent);
  skin.color.set(kit.skin).multiplyScalar(1.18);
  skin.emissive.set('#bc8e74').multiply(skin.color);skin.emissiveIntensity=.085;
  hair.color.set(kit.hair);printPattern.value=kit.pattern;
  sleeveTone.value.set(kit.pattern===1?'#f8eee0':kit.accent);
  head.scale.set(1+(kit.build[0]-1)*.45,1,1+(kit.build[2]-1)*.45);
  for(const [mat,base] of faceTints)mat.color.set(base).multiply(skin.color);
  if(printContext.clearRect){
   printContext.clearRect(0,0,512,256);printContext.textAlign='center';
   printContext.fillStyle=(.2126*jersey.color.r+.7152*jersey.color.g+.0722*jersey.color.b)>.40?'#152436':'#f7f5e9';
   printContext.font='bold 65px Arial';printContext.fillText(kit.lettering,256,97,484);
   printContext.font='bold 86px Arial';printContext.fillText(kit.team,256,193,405);printMap.needsUpdate=true;
  }
  if(currentCut!==kit.cut){
   adjustHair?.(kit.cut);currentCut=kit.cut;
  }
  root.userData.kit=kit.key;
 }
 setKit();
 update();return {root,body,torso,head,legs:[bones['upperleg01.L'],bones['upperleg01.R']],knees:[bones['lowerleg01.L'],bones['lowerleg01.R']],arms:[bones['upperarm01.L'],bones['upperarm01.R']],elbows:[bones['lowerarm01.L'],bones['lowerarm01.R']],wrists:[bones['wrist.L'],bones['wrist.R']],skeleton,meshes,bones,bind,shoes,racket,update,setKit,setWristband,resetFeet:()=>{footPlants.forEach(foot=>foot.reset());ready=0;carriedX=0;carriedZ=0;}};
}

