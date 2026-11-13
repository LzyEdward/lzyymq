// Metre-space skin detail shared by the baked mesh and its runtime fallback.
// Shape stays in the closed sculpt; surface detail doesn't add draw calls.
const gauss=(v,s)=>Math.exp(-v*v/(s*s));
export const HAND_UV={minX:-.065,minY:-.285,width:.455,height:.47};
export function handUV(x,y){return [(x-HAND_UV.minX)/HAND_UV.width,(y-HAND_UV.minY)/HAND_UV.height];}
export function handTint(x,y,z){
 const palm=Math.max(0,Math.min(1,(z+.005)*40));
 const tip=gauss(x+.016,.022)*gauss(y-.077,.075);
 const thenar=gauss(x-.057,.028)*gauss(y-.065,.04);
 const forearm=1-Math.max(0,Math.min(1,(y+.02)/.07));
 // Broad, restrained colour variations. No painted-on contact shadows.
 const mottling=Math.sin(x*171+y*97+z*113)*Math.sin(y*249-z*71)*.005;
 const vein=forearm*gauss(x-(.12-y*.74+Math.sin(y*32)*.004),.0018)*.012;
 const joint=gauss(x-.002,.012)*gauss(y-.078,.06)+gauss(x-.038,.017)*gauss(y-.11,.009);
 const wrist=gauss(x-.119,.019)*gauss(y-.027,.023);
 return [.49+palm*.035+tip*.032+thenar*.008+mottling-vein+joint*.009-wrist*.008,
         .295+palm*.033+tip*.003+mottling-vein*.25-joint*.009-wrist*.011,
         .195+palm*.024+tip*.001+mottling+vein*.17-joint*.006-wrist*.007];
}

function creaseAt(x,y){
 let crease=0;
 for(const cy of [.116,.092,.069,.048]){
  const mask=gauss(y-(cy-.011),.0065);
  crease+=mask*gauss(x-(-.013+(y-cy)*.22),.0008)*.45;
  crease+=mask*gauss(x-.008,.00065)*.28;
 }
 const palmMask=gauss(x-.055,.028)*gauss(y-.074,.04);
 crease+=palmMask*gauss(y-(.041+(x-.028)*.64+Math.sin(x*45)*.004),.0009)*.38;
 crease+=gauss(y-(.105-(x-.045)*.28),.0007)*gauss(x-.052,.028)*.24;
 const wristY=.025-(x-.118)*.88;
 crease+=gauss(y-wristY,.0009)*gauss(x-.122,.018)*.25;
 return Math.min(.85,crease);
}
export function createHandSkin(THREE){
 const size=512,pixels=new Uint8Array(size*size);let seed=9173;
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const x=HAND_UV.minX+(i+.5)/size*HAND_UV.width,y=HAND_UV.minY+(j+.5)/size*HAND_UV.height;
  const pore=(seed/4294967296-.5)*14,grain=Math.sin(i*1.41+j*.79)*3;
  pixels[j*size+i]=Math.round(145+pore+grain-creaseAt(x,y)*66);
 }
 const bump=new THREE.DataTexture(pixels,size,size,THREE.RedFormat);bump.wrapS=bump.wrapT=THREE.ClampToEdgeWrapping;bump.magFilter=THREE.LinearFilter;bump.minFilter=THREE.LinearMipmapLinearFilter;bump.generateMipmaps=true;bump.needsUpdate=true;
 return new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.68,bumpMap:bump,bumpScale:.00048,clearcoat:.008,clearcoatRoughness:.85,sheen:.055,sheenColor:'#ba8971'});
}
