import * as source from './assets/athlete-data.mjs';
import {boundedAsset,decodeAssetBuffer} from './asset-loading.mjs';
import {gripRig} from './grip-rig.mjs';
import {supportFingerPaths} from './hand-pose.mjs';
import {ARM_WRIST,ARM_ELBOW} from './first-person-arm.mjs';
import {handUV} from './hand-surface.mjs';
let armGeometry=null;
export const playerArmAvailable=()=>armGeometry!==null;
export const ARM_BONES=source.bones.filter(b=>/^(?:upperarm01|lowerarm01|wrist|finger\d-\d)\.R$/.test(b.name)).map(b=>b.name);
export function armBufferLayout(bytes){
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<24)throw new Error('完整手臂数据不完整');
 const [magic,vertices,indices,groups,bones]=new Uint32Array(bytes,0,6);
 if(magic!==0x314d5241||vertices<100||vertices>200000||indices<300||indices>1200000||indices%3||groups<1||groups>8||bones!==18)throw new Error('完整手臂格式无效');
 const streams=[['position',Float32Array,3],['normal',Int16Array,3],['color',Uint8Array,3],['uv',Float32Array,2],['skinIndex',Uint16Array,4],['skinWeight',Uint16Array,4]];
 let offset=24;const layout=streams.map(([name,Type,size])=>{offset=Math.ceil(offset/Type.BYTES_PER_ELEMENT)*Type.BYTES_PER_ELEMENT;const at=offset;offset+=vertices*size*Type.BYTES_PER_ELEMENT;return {name,Type,size,at};});offset=Math.ceil(offset/4)*4;
 const indexOffset=offset,groupOffset=offset+indices*4;if(bytes.byteLength!==groupOffset+groups*12)throw new Error('完整手臂下载不完整');
 return {vertices,indices,groups,bones,layout,indexOffset,groupOffset};
}
export async function preparePlayerArm(T,{safe=false,onWarning=()=>{}}={}){
 armGeometry=null;if(safe)return;
 armGeometry=await boundedAsset(async signal=>{
  const file=typeof DecompressionStream!=='undefined'?'player-arm.bin.gz':'player-arm.bin';
  const response=await fetch(new URL(`./assets/${file}?v=7.16.0`,import.meta.url),{signal});if(!response.ok)throw new Error(`完整手臂 HTTP ${response.status}`);
  const bytes=await decodeAssetBuffer(await response.arrayBuffer()),{vertices,indices,groups,bones,layout,indexOffset,groupOffset}=armBufferLayout(bytes),geometry=new T.BufferGeometry();
  for(const {name,Type,size,at} of layout){let values=new Type(bytes,at,vertices*size);if(name==='normal')values=Float32Array.from(values,v=>v/32767);if(name==='color')values=Float32Array.from(values,v=>v/255);if(name==='skinWeight')values=Float32Array.from(values,v=>v/65535);geometry.setAttribute(name,new T.BufferAttribute(values,size));}
  const ids=new Uint32Array(bytes,indexOffset,indices);if(ids.some(v=>v>=vertices)||geometry.attributes.skinIndex.array.some(v=>v>=bones))throw new Error('完整手臂索引无效');
  geometry.setIndex(new T.BufferAttribute(ids,1));const grouped=new Uint32Array(bytes,groupOffset,groups*3);
  for(let i=0;i<groups;i++){const [start,count,material]=grouped.slice(i*3,i*3+3);if(start+count>indices||material>1||count%3)throw new Error('完整手臂材质范围无效');geometry.addGroup(start,count,material);}
  geometry.computeBoundingSphere();return geometry;
 },{timeout:20000,label:'完整手臂模型',onWarning});
}

export function createSkinnedPlayerArm(T,{skin,fabric,open=false}={}){
 if(!armGeometry)return null;
 const V=(...p)=>new T.Vector3(...p),bind=new Map(source.bones.map(b=>[b.name,V(...b.position)]));
 const wrist=bind.get('wrist.R'),elbow=bind.get('lowerarm01.R'),shoulder=bind.get('upperarm01.R');
 const targetWrist=V(...ARM_WRIST),targetElbow=V(...ARM_ELBOW);
 const {across,matrices:constant,segment:map,poseFingers}=gripRig(T,bind,open);
 const lower=map(elbow,wrist,targetElbow,targetWrist,.87,.87);
 const pinchMatrices=new Map([...constant].map(([key,matrix])=>[key,matrix.clone()]));let lastRelaxation=0;
 let lastFist=0;
 function relaxFingers(amount=0,fist=0){
  if(!open)return;
  amount=Math.max(0,Math.min(1,Number.isFinite(amount)?amount:0));
  if(Math.abs(amount-lastRelaxation)<1e-5&&Math.abs(fist-lastFist)<1e-5)return;
  lastRelaxation=amount;lastFist=fist;poseFingers(supportFingerPaths(amount,fist));
 }
 function poseNails(details){
  if(!open)return;
  for(const [index,nail]of details.entries()){
   const name=`finger${index===4?1:index+2}-3.R`;
   if(!nail.userData.pinchMatrix){nail.updateMatrix();nail.userData.pinchMatrix=nail.matrix.clone();}
   nail.matrixAutoUpdate=false;nail.matrix.copy(constant.get(name)).multiply(pinchMatrices.get(name).clone().invert()).multiply(nail.userData.pinchMatrix);nail.matrixWorldNeedsUpdate=true;
  }
 }
 const joints=ARM_BONES.map(name=>{const bone=new T.Bone();bone.name='FPS '+name;bone.matrixAutoUpdate=false;return bone;}),skeleton=new T.Skeleton(joints,joints.map(()=>new T.Matrix4()));
 // Albedo uses the anatomical UV atlas. Palm creases need their own posed,
 // metre-space coordinates; sampling them with the atlas UV made wrist rings.
 // Share immutable streams between the arms and add only the two-float UV set.
 const geometry=new T.BufferGeometry();for(const [name,attribute] of Object.entries(armGeometry.attributes))geometry.setAttribute(name,attribute);
 geometry.setIndex(armGeometry.index);for(const g of armGeometry.groups)geometry.addGroup(g.start,g.count,g.materialIndex);
 geometry.boundingSphere=armGeometry.boundingSphere;
 const detailUV=[],point=V(),transformed=V();
 for(let i=0;i<geometry.attributes.position.count;i++){
  point.fromBufferAttribute(geometry.attributes.position,i);transformed.set(0,0,0);
  for(let k=0;k<4;k++){
   const id=geometry.attributes.skinIndex.array[i*4+k],weight=geometry.attributes.skinWeight.array[i*4+k];
   if(weight)transformed.addScaledVector(point.clone().applyMatrix4(constant.get(ARM_BONES[id])||lower),weight);
  }
  detailUV.push(...handUV(transformed.x,transformed.y));
 }
 geometry.setAttribute('uv1',new T.Float32BufferAttribute(detailUV,2));
 const material=skin.clone();material.bumpMap=skin.bumpMap.clone();material.bumpMap.channel=1;material.bumpMap.needsUpdate=true;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uArmFabric={value:fabric.color};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vArmRest;\nvarying float vSleeve;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vArmRest=position;
    float upperDistance=dot(position-vec3(-.1956952,1.4285583,.0110798),normalize(vec3(-.174129,-.199015,-.002339)));
    vSleeve=1.-smoothstep(.151,.153,upperDistance);
    transformed+=normal*vSleeve*.0025;
   `).replace('#include <skinning_vertex>',`#include <skinning_vertex>
   ${open?'':'if(transformed.y>.025&&transformed.y<.14){float r=length(transformed.xz);if(r<.0141&&r>.000001)transformed.xz*=.0141/r;}'}
 `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vArmRest;\nvarying float vSleeve;\nuniform vec3 uArmFabric;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    float grain=sin(vArmRest.x*1700.)*sin(vArmRest.y*1700.);
    float fold=sin(vArmRest.y*95.+vArmRest.z*14.)*sin(vArmRest.x*60.+vArmRest.y*14.);
    float sleeveDistance=dot(vArmRest-vec3(-.1956952,1.4285583,.0110798),normalize(vec3(-.174129,-.199015,-.002339)));
    float sleeveMask=1.-smoothstep(.151,.153,sleeveDistance);
    float hem=(1.-smoothstep(.0007,.0014,abs(sleeveDistance-.146)))*.10;
    diffuseColor.rgb=mix(diffuseColor.rgb,uArmFabric*(.985+grain*.009+fold*.026-hem),sleeveMask);
   `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.91,sleeveMask);');
 };material.customProgramCacheKey=()=> 'closed-complete-arm-skin-v3-'+open;
 const mesh=new T.SkinnedMesh(geometry,material);mesh.name='Continuous shoulder elbow wrist and five-finger grip';mesh.frustumCulled=false;mesh.bind(skeleton,new T.Matrix4());mesh.normalizeSkinWeights();
 const root=new T.Group();root.add(mesh,...joints);const original=targetElbow.clone().sub(targetWrist).normalize(),inverse=new T.Matrix4(),rotation=new T.Quaternion();
 function update(group,chain){
  group.updateMatrix();inverse.copy(group.matrix).invert();
  const liveElbow=chain.elbow.clone().applyMatrix4(inverse),liveShoulder=chain.shoulder.clone().applyMatrix4(inverse);
  rotation.setFromUnitVectors(original,liveElbow.clone().sub(targetWrist).normalize());
  const lowerMatrix=new T.Matrix4().makeTranslation(...targetWrist.toArray()).multiply(new T.Matrix4().makeRotationFromQuaternion(rotation)).multiply(new T.Matrix4().makeTranslation(...targetWrist.clone().negate().toArray())).multiply(lower);
  const upperMatrix=map(shoulder,elbow,liveShoulder,liveElbow,.87,.87,across.clone().transformDirection(lowerMatrix));
  for(let i=0;i<joints.length;i++)joints[i].matrix.copy(ARM_BONES[i]==='upperarm01.R'?upperMatrix:ARM_BONES[i]==='lowerarm01.R'?lowerMatrix:constant.get(ARM_BONES[i]));
  root.updateWorldMatrix(true,true);skeleton.update();
 }
 return {root,mesh,update,skeleton,relaxFingers,poseNails};
}
