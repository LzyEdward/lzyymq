import {createNetMaterial} from './net-material.mjs?v=7.11.0';
export const NET_HALF_WIDTH=3.05;
export function netHeightAt(x){return 1.524+.026*(x/NET_HALF_WIDTH)**2;}

// A localized, damped wave. Post attachments never move, and no rotation
// around the floor can pull the bottom cable or uprights out of position.
export function netDeflection(x,y,{age=0,x:hitX=0,y:hitY=1.2,strength=1}={}){
 if(age<=0||age>=1.4)return 0;
 const edge=Math.max(0,1-(x/NET_HALF_WIDTH)**2),dx=Math.abs(x-hitX),width=.22+age*.18;
 if(edge<=0)return 0;
 const wave=Math.exp(-Math.pow((dx-age*2.8)/width,2)),center=Math.exp(-Math.pow(dx/(.32+age*.25),2));
 const vertical=Math.exp(-Math.pow((y-hitY)/.40,2)),tension=.15+.85*Math.sin(Math.PI*Math.max(0,Math.min(1,(netHeightAt(x)-y)/.76)));
 return edge*(wave*.62+center*.38)*vertical*tension*Math.sin(age*31)*Math.exp(-age*3.4)*strength*.072;
}

export function createCourtNet(T){
 const root=new T.Group();root.name='Regulation sagged badminton net';
 const netGeometry=new T.PlaneGeometry(NET_HALF_WIDTH*2,.76,128,16),p=netGeometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+netHeightAt(p.getX(i))-.38);
 const mesh=new T.Mesh(netGeometry,createNetMaterial(T));mesh.name='19mm square netting';root.add(mesh);
 const cloth=new Uint8Array(128*128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++)cloth[y*128+x]=140+((x+y)%2?14:-14)+Math.round(Math.sin(x*71+y*31)*5);
 const weave=new T.DataTexture(cloth,128,128,T.RedFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(65,1);weave.generateMipmaps=true;weave.minFilter=T.LinearMipmapLinearFilter;weave.needsUpdate=true;
 const tapeMaterial=new T.MeshStandardMaterial({color:'#e8e7d6',roughness:.91,bumpMap:weave,bumpScale:.00022,side:T.DoubleSide});
 tapeMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vTape;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTape=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vTape;').replace('#include <color_fragment>',`#include <color_fragment>
   float seam=(1.-smoothstep(.007,.020,abs(vTape.y-.13)))+(1.-smoothstep(.007,.020,abs(vTape.y-.87)));
   float stitches=1.-smoothstep(.18,.42,abs(fract(vTape.x*1500.)-.5));
   diffuseColor.rgb*=1.-min(1.,seam)*(.07+stitches*.10);
  `);
 };tapeMaterial.customProgramCacheKey=()=> 'stitched-net-tape-v1';
 const tapeGeometry=new T.PlaneGeometry(NET_HALF_WIDTH*2,.075,128,2),tp=tapeGeometry.attributes.position;
 for(let i=0;i<tp.count;i++)tp.setY(i,tp.getY(i)+netHeightAt(tp.getX(i))-.0375);
 tapeGeometry.computeVertexNormals();
 const tape=new T.Mesh(tapeGeometry,tapeMaterial);tape.position.z=.003;tape.name='Woven double-stitched net tape';tape.receiveShadow=true;root.add(tape);
 const white=new T.MeshStandardMaterial({color:'#dedfcb',roughness:.88}),cable=new T.MeshStandardMaterial({color:'#465344',roughness:.79});
 for(const x of [-NET_HALF_WIDTH,NET_HALF_WIDTH]){
  const binding=new T.Mesh(new T.BoxGeometry(.033,.78,.015),white);binding.position.set(x,1.16,0);root.add(binding);
 }
 const cordGeometry=new T.PlaneGeometry(NET_HALF_WIDTH*2,.008,128,1),cp=cordGeometry.attributes.position;
 for(let i=0;i<cp.count;i++)cp.setY(i,cp.getY(i)+netHeightAt(cp.getX(i))-.76);
 const cord=new T.Mesh(cordGeometry,cable);cord.material.side=T.DoubleSide;root.add(cord);
 const surfaces=[mesh,tape,cord].map(m=>({mesh:m,attribute:m.geometry.attributes.position}));
 let impulse=null;
 function hit({x=0,y=1.2}={},strength=1){impulse={x:Math.max(-3.04,Math.min(3.04,x)),y,age:0,strength:Math.max(-1.5,Math.min(1.5,strength))};}
 function update(dt){
  if(!impulse)return false;impulse.age=Math.min(1.4,impulse.age+Math.max(0,dt));
  let maxDeflection=0;
  for(const {attribute,mesh:surface} of surfaces){
   for(let i=0;i<attribute.count;i++){const z=netDeflection(attribute.getX(i),attribute.getY(i),impulse);attribute.setZ(i,z);maxDeflection=Math.max(maxDeflection,Math.abs(z));}
   attribute.needsUpdate=true;if(surface===tape)surface.geometry.computeVertexNormals();
  }
  root.userData.maxDeflection=maxDeflection;
  if(impulse.age>=1.4)impulse=null;return true;
 }
 root.userData={hit,update,postHeight:1.55,centerHeight:1.524,maxDeflection:0};return root;
}
