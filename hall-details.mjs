import {createSportsTowel} from './sports-towel.mjs?v=7.14.0';
export function dressHall(T,scene){
 const v=(x,y,z)=>new T.Vector3(x,y,z),dark=new T.MeshStandardMaterial({color:'#304744',roughness:.48,metalness:.52}),wood=new T.MeshStandardMaterial({color:'#9d7853',roughness:.63}),white=new T.MeshStandardMaterial({color:'#e0e2d5',roughness:.84}),rubber=new T.MeshStandardMaterial({color:'#25413c',roughness:.95});
 function mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
 const box=(w,h,d,m,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 function bar(a,b,r=.018,m=dark){const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,...a.clone().add(b).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;}
 // Umpire's high chair and access ladder beside the post, outside the runoff.
 const x=4.8,z=-.15;
 for(const side of [-1,1]){
  bar(v(x+side*.31,.03,z-.4),v(x+side*.25,1.7,z-.15),.023);
  bar(v(x+side*.31,.03,z+.45),v(x+side*.25,1.7,z+.15),.023);
  bar(v(x+side*.25,1.62,z-.18),v(x+side*.25,2.15,z-.18),.018);
 }
 box(.59,.065,.5,wood,x,1.66,z);box(.58,.34,.045,wood,x,1.95,z-.18);
 for(let i=0;i<5;i++)bar(v(x-.3,.25+i*.26,z+.41-i*.042),v(x+.3,.25+i*.26,z+.41-i*.042),.025);
 box(.75,.025,.85,rubber,x,.005,z);
 // Open training basket, spare feather shuttles, and a tube of new shuttles.
 const bx=-5.0,bz=1.25;
 for(const s of [-1,1])for(const t of [-1,1])bar(v(bx+s*.27,.04,bz+t*.22),v(bx+s*.27,.86,bz+t*.22),.012);
 for(const h of [.59,.72,.85])for(const side of [-1,1]){bar(v(bx-.28,h,bz+side*.23),v(bx+.28,h,bz+side*.23),.008);bar(v(bx+side*.28,h,bz-.23),v(bx+side*.28,h,bz+.23),.008);}
 for(let i=0;i<7;i++){const xx=bx-.23+i*.075;bar(v(xx,.59,bz-.23),v(xx,.85,bz-.23),.004);bar(v(xx,.59,bz+.23),v(xx,.85,bz+.23),.004);}
 for(let i=0;i<13;i++){const a=i*2.4,xx=bx+Math.sin(a)*.18,zz=bz+Math.cos(a)*.14;const f=mesh(new T.ConeGeometry(.032,.072,16,1,true),white,xx,.66+(i%3)*.035,zz);f.rotation.set(.5+Math.sin(a),a,.6);}
 mesh(new T.CylinderGeometry(.038,.038,.4,16),white,-5.3,.2,2.1);
 box(.36,.02,.54,rubber,-5.3,.01,2.1);
 // Wall clock and quiet equipment details keep the hall from feeling like an empty box.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#e1e4da';c.fillRect(0,0,256,256);c.translate(128,128);c.strokeStyle='#2d423d';
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,r=i%5?108:100;c.lineWidth=i%5?1:4;c.beginPath();c.moveTo(Math.sin(a)*r,-Math.cos(a)*r);c.lineTo(Math.sin(a)*115,-Math.cos(a)*115);c.stroke();}
 for(const [a,len,width] of [[Math.PI*.4,63,7],[Math.PI*1.18,90,4]]){c.lineWidth=width;c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(a)*len,-Math.cos(a)*len);c.stroke();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const clock=mesh(new T.CircleGeometry(.36,48),new T.MeshStandardMaterial({map:tex,roughness:.55}),8,3.45,-17.55);clock.castShadow=false;
 const frame=mesh(new T.TorusGeometry(.37,.018,8,48),dark,8,3.45,-17.57);
 const towel=new T.MeshStandardMaterial({color:'#b5c5b7',roughness:1,side:T.DoubleSide});
 towel.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vTerry;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTerry=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vTerry;').replace('#include <color_fragment>',`#include <color_fragment>
   float border=1.-smoothstep(.012,.019,min(vTerry.x,1.-vTerry.x));
   float endStripe=1.-smoothstep(.008,.014,abs(vTerry.y-.91));
   float loopPhase=vTerry.x*1300.+sin(vTerry.y*3900.)*.45;
   float loop=sin(loopPhase)*(1.-smoothstep(1.,3.,fwidth(loopPhase)));
   diffuseColor.rgb*=1.-border*.11-endStripe*.24+loop*.026;
  `);
 };towel.customProgramCacheKey=()=> 'draped-terry-stripes-v1';
 const drape=createSportsTowel(T,towel);drape.position.set(8.1,0,-10.5);scene.add(drape);
 // Soft sports luggage, piping, webbing handles, zippers and capped bottles.
 // Shared materials are merged with the static hall after construction.
 const canvasGrain=new Uint8Array(64*64);for(let j=0;j<64;j++)for(let i=0;i<64;i++)canvasGrain[j*64+i]=120+((i+j)%2?15:-15)+Math.round(Math.sin(i*17+j*41)*8);
 const weave=new T.DataTexture(canvasGrain,64,64,T.RedFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(7,3);weave.generateMipmaps=true;weave.minFilter=T.LinearMipmapLinearFilter;weave.magFilter=T.LinearFilter;weave.needsUpdate=true;
 const luggage=new T.MeshStandardMaterial({color:'#3c5360',roughness:.92,bumpMap:weave,bumpScale:.00055});
 const piping=new T.MeshStandardMaterial({color:'#b9b9a2',roughness:.86}),webbing=new T.MeshStandardMaterial({color:'#1d292d',roughness:.96,bumpMap:weave,bumpScale:.0003});
 const zipper=new T.MeshStandardMaterial({color:'#9ea9a5',roughness:.33,metalness:.68}),bottle=new T.MeshPhysicalMaterial({color:'#7faaa7',roughness:.27,clearcoat:.5,metalness:.08});
 function rounded(w,h,d,r){const g=new T.BoxGeometry(w,h,d,10,6,6),p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const a=v(p.getX(i),p.getY(i),p.getZ(i)),b=v(T.MathUtils.clamp(a.x,-w/2+r,w/2-r),T.MathUtils.clamp(a.y,-h/2+r,h/2-r),T.MathUtils.clamp(a.z,-d/2+r,d/2-r)),direction=a.clone().sub(b).normalize();a.copy(b).addScaledVector(direction,r);p.setXYZ(i,a.x,a.y,a.z);n.setXYZ(i,direction.x,direction.y,direction.z);}return g;}
 function curve(points,r,mat){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*5),r,5,false);return mesh(g,mat,0,0,0);}
 for(const [xx,zz] of [[-8.8,-10.4],[8.7,-10.4],[10.4,9]]){
  const center=v(xx,.685,zz),turn=new T.Quaternion().setFromAxisAngle(v(0,1,0),.18),place=p=>p.applyQuaternion(turn).add(center);
  const bag=mesh(rounded(.95,.35,.43,.065),luggage,...center.toArray());bag.quaternion.copy(turn);
  for(const side of [-1,1]){
   const shape=[[-.35,.11],[-.395,.06],[-.395,-.06],[-.35,-.11],[.35,-.11],[.395,-.06],[.395,.06],[.35,.11],[-.35,.11]].map(([x,y])=>place(v(x,y,side*.218)));
   curve(shape,.003,piping);
   const strap=[[-.20,.115],[-.18,.285],[0,.33],[.18,.285],[.20,.115]].map(([x,y])=>v(x,y,side*.12));
   const strapGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(strap),24,.012,6,false);strapGeometry.translate(0,0,-side*.12);strapGeometry.scale(1,1,.15);strapGeometry.translate(0,0,side*.12);
   const handle=mesh(strapGeometry,webbing,...center.toArray());handle.quaternion.copy(turn);
  }
  curve([place(v(-.37,.176,0)),place(v(0,.181,0)),place(v(.37,.176,0))],.002,zipper);
  for(const side of [-1,1])curve([place(v(-.37,.174,side*.007)),place(v(0,.180,side*.007)),place(v(.37,.174,side*.007))],.001,webbing);
  const pull=mesh(new T.TorusGeometry(.012,.002,4,12),zipper,...place(v(.32,.185,.006)).toArray());pull.rotation.x=Math.PI/2;
  const bottleX=xx+.78;
  mesh(new T.CylinderGeometry(.053,.058,.20,16),bottle,bottleX,.61,zz);
  mesh(new T.CylinderGeometry(.026,.051,.05,16),bottle,bottleX,.735,zz);
  mesh(new T.CylinderGeometry(.029,.029,.025,16),webbing,bottleX,.77,zz);
  for(const yy of [.762,.770,.778]){const rib=mesh(new T.TorusGeometry(.0293,.0012,4,20),webbing,bottleX,yy,zz);rib.rotation.x=Math.PI/2;}
  mesh(new T.CylinderGeometry(.0551,.0571,.08,16,1,true),piping,bottleX,.60,zz);
 }
 // Wall skirting, acoustic-panel joints and grounded practical equipment.
 for(const side of [-1,1]){
  box(29.3,.13,.07,dark,0,.065,side*17.59);
  for(let xx=-13.5;xx<=13.5;xx+=2.7){box(.018,2.67,.025,dark,xx,1.43,side*17.64);}
  for(const xx of [-11.4,11.4]){
   box(.64,.7,.035,rubber,xx,1.45,side*17.5);
   const extinguisher=mesh(new T.CylinderGeometry(.09,.09,.38,14),new T.MeshStandardMaterial({color:'#a64132',roughness:.52}),xx,1.39,side*17.42);
   box(.15,.045,.08,dark,xx,1.6,side*17.42);bar(v(xx+.08,1.58,side*17.42),v(xx+.13,1.3,side*17.4),.012);
  }
 }
 // Mat joins stay subtle and outside the playing lines.
 const seam=new T.MeshStandardMaterial({color:'#245b52',roughness:.95});
 for(const xx of [-3.88,3.88])box(.008,.0002,16.1,seam,xx,.0001,0);
 // Baked soft contact shadows for furniture that doesn't need another shadow light.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const s=shadowCanvas.getContext('2d'),gradient=s.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'#071b174f');gradient.addColorStop(.5,'#071b1724');gradient.addColorStop(1,'#071b1700');s.fillStyle=gradient;s.fillRect(0,0,128,128);
 const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
 for(const [x,z,w,d] of [[-8.5,-10.5,5,1.2],[8.5,-10.5,5,1.2],[9.8,9,5,1.2],[4.8,-.15,1.1,1.1],[-5,1.25,.9,.8]]){const p=mesh(new T.PlaneGeometry(w,d),shadowMat,x,-.0034,z);p.rotation.x=-Math.PI/2;p.castShadow=p.receiveShadow=false;}
 for(const [x,z]of [[-8.8,-10.4],[8.7,-10.4],[10.4,9]])for(const [xx,w,d]of [[x,1.08,.50],[x+.78,.17,.17]]){const p=mesh(new T.PlaneGeometry(w,d),shadowMat,xx,.5104,z);p.rotation.x=-Math.PI/2;p.castShadow=p.receiveShadow=false;}
}
