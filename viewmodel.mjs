import { sculptGrip } from './hand-sculpt.mjs?v=26581a33b80c9ba8';
import {createArmKinematics} from './first-person-arm.mjs?v=266661bd87fc52e1';
import {createSkinnedPlayerArm} from './player-arm.mjs?v=367dc41c1ae072fd';

// Dedicated first-person anatomy: one closed wrist, palm, thumb web and hand.
export function createViewmodel(THREE,createRacket,{skinMap=null,articulated=false}={}){
 const root=new THREE.Group(),V=(...p)=>new THREE.Vector3(...p);
 const hand=sculptGrip(THREE);root.add(hand.mesh,...hand.details);root.userData.hand=hand.mesh;
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
 const support=new THREE.Group(),open=sculptGrip(THREE,{open:true});support.add(open.mesh,...open.details);sleeve(support);support.scale.x=-1;root.userData.support=support;
 if(skinMap)for(const mesh of [hand.mesh,open.mesh])if(mesh.geometry.userData.skinUV){mesh.material.map=skinMap;mesh.material.vertexColors=false;mesh.material.bumpMap.channel=1;mesh.material.needsUpdate=true;}
 if(articulated){
  const rig=createArmKinematics(THREE),arm=createSkinnedPlayerArm(THREE,{skin:hand.mesh.material,fabric});
  if(arm){root.add(arm.root);hand.mesh.visible=false;rightSleeve.visible=false;root.userData.fullArm=arm;
  const leftRig=createArmKinematics(THREE,{side:-1}),leftArm=createSkinnedPlayerArm(THREE,{skin:open.mesh.material,fabric,open:true});
  if(leftArm){support.add(leftArm.root);open.mesh.visible=false;support.children.find(o=>o.name==='Rounded sleeve').visible=false;}
  root.userData.updateArm=()=>{
   if(!root.visible)return;
   const pose=rig.pose({position:root.position.toArray(),rotation:[root.rotation.x,root.rotation.y,root.rotation.z]});
   root.position.fromArray(pose.position);root.rotation.fromArray([...pose.rotation,'XYZ']);const chain=rig.chain(root);arm.update(root,chain);
   root.userData.armReport={reachable:chain.reachable,extension:chain.extension,correction:pose.correction};
   if(leftArm&&support.visible)leftArm.update(support,leftRig.chain(support));
   root.updateWorldMatrix(true,true);
  };}
 }
 for(const group of [root,support])group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 return root;
}
