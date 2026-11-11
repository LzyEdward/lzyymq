import {createAthlete} from './athlete-real.mjs?v=6.4.0';

// Bake the actual articulated hand, including its smooth skinned normals.
// Recomputing normals on an unindexed triangle soup makes every face visible.
export function createViewmodel(THREE,createRacket){
 const root=new THREE.Group(),rig=createAthlete(THREE,()=>new THREE.Group());
 const wristOffset=new THREE.Vector3(.095,.085,-.015);
 function bakeHand(grip){
  rig.update({grip});rig.root.updateMatrixWorld(true);rig.skeleton.update();
  const source=rig.meshes[1],attrs=source.geometry.attributes,index=source.geometry.index;
  const wrist=rig.bones['wrist.R'].getWorldPosition(new THREE.Vector3());
  // Crop the skinned hand on a plane normal to the forearm. A world-X cutoff
  // retained a wedge of the arm and made the wrist look like a second lump.
  const wristBind=rig.bind['wrist.R'],forearmBind=rig.bind['lowerarm01.R'],armAxis=wristBind.clone().sub(forearmBind).normalize(),cutPoint=wristBind.clone().addScaledVector(armAxis,-.012),cutTest=new THREE.Vector3();
  const across=rig.bones['finger2-1.R'].getWorldPosition(new THREE.Vector3()).sub(rig.bones['finger5-1.R'].getWorldPosition(new THREE.Vector3())).normalize();
  const longitudinal=rig.bones['finger3-1.R'].getWorldPosition(new THREE.Vector3()).sub(wrist);longitudinal.addScaledVector(across,-longitudinal.dot(across)).normalize();
  const frame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(longitudinal,across,longitudinal.clone().cross(across).normalize()));
  const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI).multiply(frame.invert());
  const p=new THREE.Vector3(),normal=new THREE.Vector3(),part=new THREE.Vector3(),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3().getNormalMatrix(source.matrixWorld);
  const positions=[],normals=[],colors=[],uvs=[];
  for(let i=0;i<index.count;i+=3){
   const vs=[index.getX(i),index.getX(i+1),index.getX(i+2)];
   if(vs.some(v=>cutTest.fromBufferAttribute(attrs.position,v).sub(cutPoint).dot(armAxis)<0))continue;
   for(const v of vs){
    source.getVertexPosition(v,p);source.localToWorld(p);p.sub(wrist).applyQuaternion(orientation).add(wristOffset);
    normal.set(0,0,0);
    for(let k=0;k<4;k++){
     const weight=attrs.skinWeight.getComponent(v,k);if(weight===0)continue;
     matrix.fromArray(rig.skeleton.boneMatrices,attrs.skinIndex.getComponent(v,k)*16);
     part.fromBufferAttribute(attrs.normal,v).transformDirection(matrix);normal.addScaledVector(part,weight);
    }
    normal.applyMatrix3(normalMatrix).applyQuaternion(orientation).normalize();
    positions.push(...p.toArray());normals.push(...normal.toArray());
    colors.push(attrs.color.getX(v),attrs.color.getY(v),attrs.color.getZ(v));uvs.push(attrs.uv.getX(v),attrs.uv.getY(v));
   }
  }
  const geometry=new THREE.BufferGeometry();
  for(const [name,values,size] of [['position',positions,3],['normal',normals,3],['color',colors,3],['uv',uvs,2]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,size));
  const material=source.material.clone();material.roughness=.57;material.bumpScale=.0002;
  return new THREE.Mesh(geometry,material);
 }
 const hand=bakeHand(1);root.add(hand);root.userData.hand=hand;
 const r=createRacket(true);r.scale.setScalar(.96);
 // Keep the grip axis inside the palm. The hand is baked with wristOffset;
 // leaving the racket at the viewmodel origin made the palm float beside it.
 r.position.copy(wristOffset).add(new THREE.Vector3(-.012,.012,-.006));
 root.add(r);root.userData.racketModel=r;root.userData.head=new THREE.Vector3(0,.4896,0).add(r.position);
 const armMaterial=hand.material.clone();armMaterial.vertexColors=false;armMaterial.color.set('#c2957d');
 const fabric=new THREE.MeshPhysicalMaterial({color:'#dae3df',roughness:.88,sheen:.55,bumpMap:hand.material.bumpMap,bumpScale:.00028});
 const armMeshes=[];
 function arm(parent,points,radii,mat){
  const ps=[],uv=[],idx=[],n=32,centers=points.map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(centers,false,'centripetal'),rings=(points.length-1)*6+1;
  for(let j=0;j<rings;j++){
   const t=j/(rings-1),center=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),scaled=t*(radii.length-1),i0=Math.min(radii.length-2,Math.floor(scaled)),radius=THREE.MathUtils.lerp(radii[i0],radii[i0+1],scaled-i0);
   const u=new THREE.Vector3(1,0,0).addScaledVector(tangent,-tangent.x).normalize(),v=new THREE.Vector3().crossVectors(tangent,u).normalize();
   for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,p=center.clone().addScaledVector(u,Math.cos(a)*radius).addScaledVector(v,Math.sin(a)*radius*.91);ps.push(...p.toArray());uv.push(i/n,t);}
   if(j)for(let k=0;k<n;k++){const a=(j-1)*(n+1)+k,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1);}
  }
  // Close both ends so no hollow tube edge cuts through the skin or cuff.
  const startCenter=ps.length/3;ps.push(...points[0]);uv.push(.5,0);
  const endCenter=ps.length/3;ps.push(...points.at(-1));uv.push(.5,1);
  for(let i=0;i<n;i++){
   idx.push(startCenter,(i+1)%(n+1),i);
   const end=(rings-1)*(n+1);idx.push(endCenter,end+i,end+i+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();parent.add(new THREE.Mesh(g,mat));
  const mesh=parent.children.at(-1);mesh.name=mat===fabric?'Rounded sleeve':'Continuous forearm';mesh.userData.maxRadius=Math.max(...radii);mesh.userData.ringCount=rings;armMeshes.push(mesh);return mesh;
 }
 function forearm(parent){
  arm(parent,[[.083,.105,-.035],[.095,.085,-.015],[.104,.035,.025],[.12,-.055,.09],[.16,-.15,.16],[.22,-.29,.26],[.27,-.43,.36]],[.026,.027,.031,.041,.045,.047,.053],armMaterial);
  // A close-fitting sleeve overlaps the forearm slightly at its cuff; the old
  // oversized endpoint and wrist ball created the visible floating joint.
  arm(parent,[[.206,-.26,.237],[.239,-.36,.30],[.29,-.49,.40]],[.047,.049,.054],fabric);
 }
 forearm(root);root.userData.armMeshes=armMeshes;
 const support=new THREE.Group();support.add(bakeHand(.12));forearm(support);support.scale.x=-1;root.userData.support=support;
 root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 support.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 rig.root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])m.dispose();});
 return root;
}
