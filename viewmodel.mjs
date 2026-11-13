import { sculptGrip } from './hand-sculpt.mjs?v=7.0.0';

// Dedicated first-person anatomy: one closed wrist, palm, thumb web and hand.
export function createViewmodel(THREE,createRacket){
 const root=new THREE.Group(),V=(...p)=>new THREE.Vector3(...p);
 const hand=sculptGrip(THREE);root.add(hand.mesh,...hand.details);root.userData.hand=hand.mesh;
 const racket=createRacket(true);racket.scale.setScalar(.96);root.add(racket);
 root.userData.racketModel=racket;root.userData.head=V(0,.4896,0);
 root.userData.gripReport={handleAxis:[0,.075,0],minimumSkinRadius:.0133,closedSurface:true,fingers:5,method:'sculpted continuous grip'};
 root.userData.armMeshes=[hand.mesh];
 const fabric=new THREE.MeshPhysicalMaterial({color:'#dce3df',roughness:.9,sheen:.5});
 root.userData.fabric=fabric;
 function sleeve(parent){
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.043,.047,.17,40,12,true),fabric);
  cuff.name='Rounded sleeve';cuff.position.set(.331,-.226,.082);cuff.quaternion.setFromUnitVectors(V(0,1,0),V(.63,-.77,.14).normalize());
  cuff.userData.maxRadius=.047;cuff.userData.ringCount=13;parent.add(cuff);
 }
 sleeve(root);
 const support=new THREE.Group(),open=sculptGrip(THREE,{open:true});support.add(open.mesh,...open.details);sleeve(support);support.scale.x=-1;root.userData.support=support;
 for(const group of [root,support])group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 return root;
}
