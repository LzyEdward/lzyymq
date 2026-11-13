import { sculptGrip } from './hand-sculpt.mjs?v=2ff2bafddd7dc52f';
import {createArmKinematics} from './first-person-arm.mjs?v=266661bd87fc52e1';
import {createSkinnedPlayerArm,playerArmAvailable} from './player-arm.mjs?v=534b92310284e328';
import {createHandSkin} from './hand-surface.mjs?v=e4f19a20f78b897f';
import {ARM_NAILS} from './arm-nails.mjs?v=f8ad14caebc6a156';

// A complete arm already contains its palm and fingers. Only its material and
// baked nail attachments are needed; don't download or sculpt a hidden hand.
function armHandSeed(T,open=false){
 const geometry=new T.BufferGeometry();geometry.userData.skinUV=true;
 const mesh=new T.Mesh(geometry,createHandSkin(T)),material=new T.MeshPhysicalMaterial({color:'#bb9584',roughness:.48,clearcoat:.12,clearcoatRoughness:.6});
 const details=ARM_NAILS[open?'open':'grip'].map((pose,i)=>{const nail=new T.Mesh(new T.SphereGeometry(1,20,12),material);nail.name=['Index','Middle','Ring','Little','Thumb'][i]+' nail';nail.position.fromArray(pose.position);nail.quaternion.fromArray(pose.quaternion);nail.scale.fromArray(pose.scale);nail.visible=pose.visible;return nail;});
 return {mesh,details};
}

// Dedicated first-person anatomy: one closed wrist, palm, thumb web and hand.
export function createViewmodel(THREE,createRacket,{skinMap=null,articulated=false}={}){
 const root=new THREE.Group(),V=(...p)=>new THREE.Vector3(...p);
 const complete=articulated&&playerArmAvailable();
 const hand=complete?armHandSeed(THREE):sculptGrip(THREE);root.add(hand.mesh,...hand.details);root.userData.hand=hand.mesh;
 const racket=createRacket(true);racket.scale.setScalar(.96);root.add(racket);
 root.userData.racketModel=racket;root.userData.head=V(0,.4896,0);
 root.userData.gripReport={handleAxis:[0,.075,0],minimumSkinRadius:.0133,closedSurface:true,fingers:5,method:hand.mesh.geometry.userData.anatomical?'posed anatomical topology':'lightweight continuous fallback'};
 root.userData.armMeshes=[hand.mesh];
 const fabric=new THREE.MeshPhysicalMaterial({color:'#dce3df',roughness:.9,sheen:.5});
 root.userData.fabric=fabric;
 function sleeve(parent){
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.043,.047,.17,40,12,true),fabric);
  cuff.name='Rounded sleeve';cuff.position.set(.331,-.226,.082);cuff.quaternion.setFromUnitVectors(V(0,1,0),V(.63,-.77,.14).normalize());
  cuff.userData.maxRadius=.047;cuff.userData.ringCount=13;parent.add(cuff);return cuff;
 }
 const rightSleeve=sleeve(root);
 const support=new THREE.Group(),open=complete?armHandSeed(THREE,true):sculptGrip(THREE,{open:true});support.add(open.mesh,...open.details);sleeve(support);support.scale.x=-1;root.userData.support=support;
 if(skinMap)for(const mesh of [hand.mesh,open.mesh])if(mesh.geometry.userData.skinUV){mesh.material.map=skinMap;mesh.material.vertexColors=false;mesh.material.bumpMap.channel=1;mesh.material.needsUpdate=true;}
 if(articulated){
  const rig=createArmKinematics(THREE),arm=createSkinnedPlayerArm(THREE,{skin:hand.mesh.material,fabric});
  if(arm){root.add(arm.root);hand.mesh.visible=false;rightSleeve.visible=false;root.userData.fullArm=arm;root.userData.hand=arm.mesh;root.userData.armMeshes=[arm.mesh];root.userData.gripReport.method='continuous anatomical skinned arm';
  const leftRig=createArmKinematics(THREE,{side:-1}),leftArm=createSkinnedPlayerArm(THREE,{skin:open.mesh.material,fabric,open:true});
  if(leftArm){support.add(leftArm.root);open.mesh.visible=false;support.children.find(o=>o.name==='Rounded sleeve').visible=false;}
  root.userData.updateArm=()=>{
   if(!root.visible)return;
   const pose=rig.pose({position:root.position.toArray(),rotation:[root.rotation.x,root.rotation.y,root.rotation.z]});
   root.position.fromArray(pose.position);root.rotation.fromArray([...pose.rotation,'XYZ']);const chain=rig.chain(root);arm.update(root,chain);
   root.userData.armReport={reachable:chain.reachable,extension:chain.extension,correction:pose.correction};
   if(leftArm&&support.visible){leftArm.relaxFingers(support.userData.relaxation);leftArm.update(support,leftRig.chain(support));leftArm.poseNails(open.details);}
   root.updateWorldMatrix(true,true);
  };}
 }
 for(const group of [root,support])group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 return root;
}
