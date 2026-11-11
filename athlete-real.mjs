import * as data from './assets/athlete-data.mjs?v=6.4.1';
import {FootPlant} from './footwork.mjs?v=6.4.1';

// A continuous CC0 anatomical mesh, 48-bone skin, and two-bone limb IK.
export function createAthlete(THREE, createRacket) {
 const root=new THREE.Group(),body=new THREE.Group();root.name='Athlete · anatomical skin · 1.81m';root.add(body);
 const vec=(...v)=>new THREE.Vector3(...v),clamp=THREE.MathUtils.clamp,bones={},bind={};
 for(const spec of data.bones){const bone=new THREE.Bone();bone.name=spec.name;bones[spec.name]=bone;bind[spec.name]=vec(...spec.position);}
 for(const spec of data.bones){const parent=spec.parent?bones[spec.parent]:body;bones[spec.name].position.copy(bind[spec.name]);if(spec.parent)bones[spec.name].position.sub(bind[spec.parent]);parent.add(bones[spec.name]);}
 body.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(data.bones.map(spec=>bones[spec.name]));skeleton.calculateInverses();
 function grain(size,cloth=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(Math.sin(x*71.3+y*113.1)*43758.5453)%1,c=Math.floor(128+n*(cloth?23:13));ctx.fillStyle='rgb('+c+','+c+','+c+')';ctx.fillRect(x,y,1,1);}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(cloth?100:9,cloth?100:9);return texture;
 }
 const weave=grain(32,true),skin=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.48,bumpMap:grain(64),bumpScale:.00045,clearcoat:.08,clearcoatRoughness:.6,sheen:.12,sheenColor:'#dcad91'});
 const jersey=new THREE.MeshPhysicalMaterial({color:'#e3e9df',roughness:.84,bumpMap:weave,bumpScale:.00065,sheen:.7,sheenRoughness:.9,sheenColor:'#ffffff'});
 jersey.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCloth=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCloth;').replace('#include <color_fragment>',`#include <color_fragment>
   float panel=smoothstep(.163,.195,abs(vCloth.x))*(1.-smoothstep(1.25,1.34,vCloth.y))*smoothstep(.99,1.045,vCloth.y);
   float hem=1.-smoothstep(.003,.010,abs(vCloth.y-.992));
   float cuff=smoothstep(.22,.25,abs(vCloth.x))*(1.-smoothstep(.002,.008,abs(vCloth.y-1.316)));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.15,.155),panel*.83+hem*.45+cuff*.8);
   float seam=1.-smoothstep(.001,.0025,abs(vCloth.y-1.388+abs(vCloth.x)*.13));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.38,.37),seam*.28);
  `);
 };
 jersey.customProgramCacheKey=()=> 'court-performance-jersey-v3';
 const shorts=new THREE.MeshPhysicalMaterial({color:'#1c343c',roughness:.9,bumpMap:weave,bumpScale:.001,sheen:.4});
 const hairGrain=grain(64);hairGrain.repeat.set(70,70);
 const sock=new THREE.MeshStandardMaterial({color:'#dedfd4',roughness:.95,bumpMap:weave,bumpScale:.0006}),hair=new THREE.MeshPhysicalMaterial({color:'#201e1b',roughness:.91,bumpMap:hairGrain,bumpScale:.0007,sheen:.2});
 const trim=new THREE.MeshStandardMaterial({color:'#378683',roughness:.74}),black=new THREE.MeshStandardMaterial({color:'#24363d',roughness:.77}),meshes=[];
 function geometry(indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data.skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data.skinWeight,4));g.setIndex(new THREE.Uint16BufferAttribute(indices,1));g.computeVertexNormals();return g;}
 const allNormals=new THREE.Float32BufferAttribute(data.normals,3);
 function skinMesh(indices,material){const g=geometry(indices);g.setAttribute('normal',allNormals.clone());const m=new THREE.SkinnedMesh(g,material);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;body.add(m);m.bind(skeleton);meshes.push(m);return m;}
 const torso=skinMesh(data.indices1,jersey);skinMesh(data.indices0,skin);skinMesh(data.indices2,shorts);skinMesh(data.indices3,sock);
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
 const smoothCloth=torso.geometry.clone();smoothCloth.computeVertexNormals();
 const clothNormals=torso.geometry.attributes.normal;
 for(const i of new Set(data.indices1))clothNormals.setXYZ(i,smoothCloth.attributes.normal.getX(i),smoothCloth.attributes.normal.getY(i),smoothCloth.attributes.normal.getZ(i));
 smoothCloth.dispose();
 const scalp=[];
 for(let i=0;i<data.indices0.length;i+=3){const vs=data.indices0.slice(i,i+3),y=vs.reduce((s,v)=>s+data.positions[v*3+1]/3,0),z=vs.reduce((s,v)=>s+data.positions[v*3+2]/3,0);if(y>1.747||y>1.702&&z<.09||y>1.675&&z<.035)scalp.push(...vs);}
 const scalpMesh=skinMesh(scalp,hair),sp=scalpMesh.geometry.attributes.position,ns=scalpMesh.geometry.attributes.normal;
 for(let i=0;i<sp.count;i++)sp.setXYZ(i,sp.getX(i)+ns.getX(i)*.003,sp.getY(i)+ns.getY(i)*.003,sp.getZ(i)+ns.getZ(i)*.003);
 function add(geo,mat,parent=body){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function oval(parent,mat,p,s){const m=add(new THREE.SphereGeometry(1,24,16),mat,parent);m.position.copy(p);m.scale.set(...s);return m;}
 function tube(parent,mat,points,r=.002){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*4),r,5,false),mat,parent);}
 const head=bones.head,eyes=[];
 for(const side of [-1,1]){
  const center=vec(side*.0327,1.6905,.1315).sub(bind.head);
  const white=oval(head,new THREE.MeshPhysicalMaterial({color:'#d5d0c6',roughness:.27,clearcoat:1}),center,[.0125,.006,.013]);
  const iris=oval(head,new THREE.MeshStandardMaterial({color:'#392c20',roughness:.3}),center.clone().add(vec(0,-.0002,.0121)),[.0048,.0049,.0015]);
  const pupil=oval(head,new THREE.MeshPhysicalMaterial({color:'#111512',roughness:.08,clearcoat:1}),center.clone().add(vec(0,-.0002,.0133)),[.0023,.0024,.0008]);
  const glint=oval(head,new THREE.MeshBasicMaterial({color:'#fff9ee'}),center.clone().add(vec(-.0018,.0021,.0149)),[.0008,.0008,.0006]);
  eyes.push({center,white,iris,pupil,glint});
  tube(head,hair,[vec(side*.017,1.712,.14).sub(bind.head),vec(side*.033,1.717,.142).sub(bind.head),vec(side*.053,1.71,.129).sub(bind.head)],.002);
  const lidMaterial=new THREE.MeshStandardMaterial({color:'#b58a74',roughness:.67});
  for(const lower of [false,true])tube(head,lidMaterial,Array.from({length:7},(_,i)=>center.clone().add(vec((i/6-.5)*.025,Math.sin(i/6*Math.PI)*(lower?-.0048:.0058),.007+Math.sin(i/6*Math.PI)*.0047))),.0012);
 }
 const shoes=[];
 for(const suffix of ['L','R']){
  const foot=bones['foot.'+suffix],g=new THREE.Group();g.name='Indoor court shoe';foot.add(g);shoes.push(g);
  oval(g,new THREE.MeshStandardMaterial({color:'#d5cbb4',roughness:.82}),vec(0,-.047,.066),[.062,.016,.146]);
  oval(g,new THREE.MeshPhysicalMaterial({color:'#eceee6',roughness:.78,bumpMap:weave,bumpScale:.0006}),vec(0,-.018,.061),[.059,.044,.14]);
  oval(g,black,vec(0,-.008,-.035),[.057,.046,.042]);
  for(const side of [-1,1])tube(g,trim,[vec(side*.055,-.018,.13),vec(side*.058,.006,.065),vec(side*.048,.014,.005)],.006);
  for(let i=0;i<5;i++)tube(g,trim,[vec(-.02,.018,.015+i*.017),vec(0,.026,.023+i*.017),vec(.021,.018,.015+i*.017)],.0018);
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
 tube(bones.spine01,trim,Array.from({length:19},(_,i)=>{const angle=i/18*Math.PI*2;return vec(Math.cos(angle)*.079,1.507+Math.sin(angle)*.008,Math.sin(angle)*.064-.005).sub(bind.spine01);}),.0035);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d');
 if(sc.createRadialGradient){const gradient=sc.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'#0009');gradient.addColorStop(1,'#0000');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);}
 const shadow=add(new THREE.PlaneGeometry(.95,.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,opacity:.4,depthWrite:false}),root);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.castShadow=false;
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
  lunge=clamp(lunge,0,1);const netStroke=['net','push','netkill'].includes(shot),crossStep=crossover&&Math.abs(lateral)>.3;
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
   const ideal=vec(x,.076+Math.sin(swingPhase*Math.PI)*.11*run,velocity.z*travel+.012);
   if(lunge>.03){footPlants[i].reset();ideal.lerp(vec(i?-.22:.19,.076,i?.55:-.29),lunge);}
   const planted=footPlants[i].sample(root.localToWorld(ideal.clone()).toArray(),cycle,speed>.45);
   const footTarget=root.worldToLocal(vec(...planted));
   limb('upperleg01.'+suffix,footTarget,vec(side*.17+velocity.x*.1,.48,.8));
   const foot=bones['foot.'+suffix];foot.parent.getWorldQuaternion(parentQ);const desired=new THREE.Quaternion();root.getWorldQuaternion(desired);foot.quaternion.copy(parentQ.invert().multiply(desired));
  }
  const overhead=shot==='smash'||shot==='clear',under=shot==='lift'||shot==='serve';let hand=vec(-.24,1.24,.28),pole=vec(-.47,1.08,-.02);
  if(swing>0){if(overhead){if(t<.25){const u=t/.25;hand.set(-.28-u*.03,1.27+u*.43,.16-u*.3);}else{const u=(t-.25)/.75;hand.set(-.30+u*.47,1.72-u*.66,-.14+Math.sin(u*Math.PI)*.5);}}else if(under){hand.set(-.27+stroke*.35,1.13-stroke*.32,.22+stroke*.3);pole.set(-.7,.95,.05);}else hand.set(-.29+stroke*.45,1.29+stroke*.08,.22+stroke*.32);}else{hand.y+=anticipation*.19;hand.x-=run*.025+motion*run*.025;hand.z+=Math.cos(stride)*run*.055;}
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
 update();return {root,body,torso,head,legs:[bones['upperleg01.L'],bones['upperleg01.R']],knees:[bones['lowerleg01.L'],bones['lowerleg01.R']],arms:[bones['upperarm01.L'],bones['upperarm01.R']],elbows:[bones['lowerarm01.L'],bones['lowerarm01.R']],wrists:[bones['wrist.L'],bones['wrist.R']],skeleton,meshes,bones,bind,shoes,racket,update};
}
