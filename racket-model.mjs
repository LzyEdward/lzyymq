// ASTROX 100ZZ Dark Navy (554). Shape and asymmetric paint reference:
// https://badmintonworldbalcatta.com/products/astrox-100zz-dark-navy-4ug5
import {createWovenStrings} from './woven-strings.mjs?v=0a67d8f314b8c856';
import {createFrameFinish} from './racket-finish.mjs?v=64131ee4a5624476';
import {racketHeadPoint,createRacketFrame} from './racket-frame.mjs?v=ea843caa7bf9dc17';
import {RACKET_PALETTES,racketSkin} from './racket-catalog.mjs?v=99e3093fcfbf9bed';
export {RACKET_PALETTES} from './racket-catalog.mjs?v=99e3093fcfbf9bed';
export function disposeRacketModel(root){
 const resources=new Set();root.traverse(o=>{
  if(o.geometry)resources.add(o.geometry);
  for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){
   resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);
  }
 });
 for(const resource of resources)resource.dispose();
}
export function createRacketModel(THREE,{skin='astrox100zz',player=false}={}){
 const root=new THREE.Group(),V=(...p)=>new THREE.Vector3(...p),spec=racketSkin(skin),colors=spec.palette;
 const mats=Object.fromEntries(Object.entries(colors).map(([name,color])=>[name,new THREE.MeshPhysicalMaterial({color,roughness:name==='grip'?.91:.32,metalness:name==='grip'?0:.25,clearcoat:name==='grip'?0:.4})]));root.userData.styleMaterials=mats;
 const grainBytes=new Uint8Array(64*256);for(let y=0;y<256;y++)for(let x=0;x<64;x++){const weave=Math.sin((x+y*.55)*Math.PI)*Math.sin((y-x*.35)*Math.PI*.7),pore=Math.sin(x*123.7+y*47.3);grainBytes[y*64+x]=Math.round(127+weave*32+pore*12);}
 const gripGrain=new THREE.DataTexture(grainBytes,64,256,THREE.RedFormat);gripGrain.wrapS=gripGrain.wrapT=THREE.RepeatWrapping;gripGrain.repeat.set(1,1);gripGrain.generateMipmaps=true;gripGrain.minFilter=THREE.LinearMipmapLinearFilter;gripGrain.magFilter=THREE.LinearFilter;gripGrain.needsUpdate=true;mats.grip.bumpMap=gripGrain;mats.grip.bumpScale=.00012;mats.grip.roughness=.86;
 const add=(geo,mat,name)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=true;root.add(m);return m;};
 function bar(a,b,r,mat,name){const m=add(new THREE.CylinderGeometry(r,r,a.distanceTo(b),10),mat,name);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return m;}
 const handle=add(new THREE.CylinderGeometry(.0117,.0135,.17,8,12),mats.grip,'Octagonal tapered G5 grip');handle.position.y=.075;handle.rotation.y=Math.PI/8;
 const points=[];for(let i=0;i<=320;i++){const t=i/320,a=t*Math.PI*2*10.5,r=.0133-t*.0018;points.push(V(Math.cos(a)*r,-.006+t*.163,Math.sin(a)*r));}
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),320,.00038,4,false),mats.carbon,'Overgrip seam');
 const butt=add(new THREE.CylinderGeometry(.014,.0148,.009,8),mats.carbon,'Butt cap');butt.position.y=-.013;
 const end=add(new THREE.CylinderGeometry(.0128,.0128,.001,24),new THREE.MeshStandardMaterial({color:'#16613e',roughness:.66}),'Green Yonex end cap');end.position.y=-.018;
 const cone=add(new THREE.CylinderGeometry(.0032,.0117,.029,24),mats.carbon,'Control cap cone');cone.position.y=.174;
 // A 6.3 mm shaft, never a wide rectangular branding plane.
 bar(V(0,.184,0),V(0,.369,0),.00315,mats.carbon,'Hyper Slim solid shaft');
 const head=(a,inset=0)=>V(...racketHeadPoint(a,inset));
 const frameGeo=createRacketFrame(THREE),paint=new Float32Array(frameGeo.attributes.position.count*3).fill(1);
 frameGeo.setAttribute('color',new THREE.Float32BufferAttribute(paint,3));
 const finish=createFrameFinish(THREE,skin);
 add(frameGeo,new THREE.MeshPhysicalMaterial({vertexColors:true,...finish,roughness:finish.roughnessMap?1:.32,metalness:.13,clearcoat:.65,clearcoatRoughness:.23}),'Compact isometric painted frame');
 const socket=add(new THREE.CylinderGeometry(.0033,.0058,.018,18),mats.carbon,'Built-in T-joint');socket.position.y=.368;
 // Every grommet is a small physical eyelet, not a painted dot.
 const grommetGeo=new THREE.TorusGeometry(.0011,.0004,4,8),grommets=new THREE.InstancedMesh(grommetGeo,mats.grip,76),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(let i=0;i<76;i++){const a=(i+.5)/76*Math.PI*2,p=head(a,.0047),tangent=head(a+.0001).sub(head(a-.0001)).normalize(),normal=V(tangent.y,-tangent.x,0);q.setFromUnitVectors(V(0,0,1),normal);matrix.compose(p,q,V(1,1,1));grommets.setMatrixAt(i,matrix);}grommets.name='76 black grommets';root.add(grommets);
 // White woven strings with a red Yonex stencil, coloured only on strings.
 const white=[],red=[],inside=(x,y)=>Math.abs(x/.098)**2.3+Math.abs((y-.51)/.139)**2.3<=1;
 const stencil=(x,y)=>{const xx=x/.063,yy=(y-.518)/.051;for(const c of [-.51,.51]){if((xx-c)**2+(yy-.36)**2<.19**2)return true;if(yy<.02&&yy>-.58&&Math.abs(xx-c)<(.58+yy)*.56)return true;}return false;};
 function string(a,b){const steps=120;for(let j=0;j<steps;j++){const p=a.clone().lerp(b,j/steps),next=a.clone().lerp(b,(j+1)/steps),mid=p.clone().lerp(next,.5);if(!inside(mid.x,mid.y))continue;const list=stencil(mid.x,mid.y)?red:white;list.push(p.x,p.y,p.z,next.x,next.y,next.z);}}
 for(let i=0;i<22;i++)string(V((i-10.5)*.0083,.365,.00025),V((i-10.5)*.0083,.655,.00025));
 for(let i=0;i<21;i++)string(V(-.105,.51+(i-10)*.012,-.00025),V(.105,.51+(i-10)*.012,-.00025));
 if(player)root.add(createWovenStrings(THREE,{stencil}));
 else for(const [vertices,color,name] of [[white,'#e5e5df','Woven white strings'],[red,'#c13430','Yonex string stencil']]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color}));lines.name=name;root.add(lines);}
 // Wrap printing around the slim cylinder; no opaque billboard across shaft.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;const ctx=canvas.getContext('2d');
  if(ctx?.save){ctx.fillStyle=spec.shaft;ctx.fillRect(0,0,256,1024);for(let i=0;i<9;i++){ctx.fillStyle=i%2?colors.accent:colors.rim;ctx.beginPath();ctx.moveTo(0,440+i*43);ctx.lineTo(256,520+i*43);ctx.lineTo(256,535+i*43);ctx.lineTo(0,455+i*43);ctx.fill();}ctx.save();ctx.translate(150,235);ctx.rotate(-Math.PI/2);ctx.fillStyle=spec.pattern==='lightning'?'#20251d':colors.accent;ctx.font='bold 27px Arial';ctx.textAlign='center';ctx.fillText(spec.model,0,0);ctx.restore();
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const label=add(new THREE.CylinderGeometry(.00318,.00318,.174,24,1,true),new THREE.MeshPhysicalMaterial({map:tex,roughness:.3,clearcoat:.5}),'Cylindrical shaft graphics');label.position.y=.276;label.userData.printedModel=spec.model;
  }
 }
 root.name=player?spec.model+' · '+spec.edition:'Opponent racket';root.userData.skin=RACKET_PALETTES[skin]?skin:'astrox100zz';root.userData.printedModel=spec.model;root.userData.sweetSpot=[0,.51,0];return root;
}
