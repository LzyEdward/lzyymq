import {createAthlete} from './athlete-real.mjs?v=6.7.0';
import {refineSkin} from './skin-surface.mjs?v=6.7.0';

// Fit the hand around a real handle axis before applying camera transforms.
export function createViewmodel(THREE,createRacket){
 const root=new THREE.Group(),rig=createAthlete(THREE,()=>new THREE.Group()),V=(...p)=>new THREE.Vector3(...p);
 const wrist=rig.bind['wrist.R'],across=rig.bind['finger2-1.R'].clone().sub(rig.bind['finger5-1.R']).normalize();
 const long=rig.bind['finger3-1.R'].clone().sub(wrist);long.addScaledVector(across,-long.dot(across)).normalize();
 const frame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(long,across,long.clone().cross(across).normalize()));
 const canonical=frame.clone().invert(),turn=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),Math.PI);
 const size=.92,gripCenter=V(.118,.018,-.035),gripY=.075;
 const toView=p=>p.clone().sub(gripCenter).multiplyScalar(size).applyQuaternion(turn).add(V(0,gripY,0));
 const source=rig.meshes[1],attrs=source.geometry.attributes,index=source.geometry.index;
 const mat=source.material.clone();mat.roughness=.64;mat.clearcoat=.025;mat.sheen=.16;mat.bumpScale=.00022;
 const wristInView=toView(V(0,0,0));
 function poseHand(relaxed=false){
  for(const bone of Object.values(rig.bones))bone.quaternion.identity();
  rig.body.position.set(0,0,0);rig.body.rotation.set(0,0,0);
  const curls=relaxed?[[.12,.18,.1],[.17,.22,.14],[.22,.26,.17],[.3,.3,.2]]:[[.45,.91,.72],[.50,1.00,.72],[.48,.95,.68],[.38,.89,.72]];
  for(let f=2;f<=5;f++)for(let part=1;part<=3;part++)rig.bones[`finger${f}-${part}.R`].quaternion.setFromAxisAngle(across,curls[f-2][part-1]);
  const directions=relaxed?[[.5,.78,-.18],[.88,.35,-.12],[.94,.2,-.1]]:[[.88,.05,.4],[.95,-.15,.1],[.65,-.75,-.2]];
  for(let part=1;part<=3;part++){
   const bone=rig.bones[`finger1-${part}.R`];
   const rest=part===3?rig.bind['finger1-3.R'].clone().sub(rig.bind['finger1-2.R']):rig.bind[`finger1-${part+1}.R`].clone().sub(rig.bind[`finger1-${part}.R`]);
   rig.root.updateMatrixWorld(true);const parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion());
   const desired=V(...directions[part-1]).normalize().applyQuaternion(frame).applyQuaternion(parentQ.invert());
   bone.quaternion.setFromUnitVectors(rest.normalize(),desired);
  }
  rig.root.updateMatrixWorld(true);rig.skeleton.update();
 }
 const armAxis=wrist.clone().sub(rig.bind['lowerarm01.R']).normalize(),cutPoint=wrist.clone().addScaledVector(armAxis,-.065);
 function bake(relaxed=false){
  poseHand(relaxed);
  const vertices=[],boundary=new Map(),p=V(),normal=V(),part=V(),matrix=new THREE.Matrix4();
  const vertex=i=>{
   source.getVertexPosition(i,p);source.localToWorld(p);normal.set(0,0,0);
   for(let k=0;k<4;k++){const weight=attrs.skinWeight.getComponent(i,k);if(!weight)continue;matrix.fromArray(rig.skeleton.boneMatrices,attrs.skinIndex.getComponent(i,k)*16);part.fromBufferAttribute(attrs.normal,i).transformDirection(matrix);normal.addScaledVector(part,weight);}
   return {p:p.clone().sub(wrist).applyQuaternion(canonical),n:normal.clone().applyQuaternion(canonical).normalize(),c:V(attrs.color.getX(i),attrs.color.getY(i),attrs.color.getZ(i)),uv:new THREE.Vector2(attrs.uv.getX(i),attrs.uv.getY(i)),d:V().fromBufferAttribute(attrs.position,i).sub(cutPoint).dot(armAxis)};
  };
  const blend=(a,b,t)=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),c:a.c.clone().lerp(b.c,t),uv:a.uv.clone().lerp(b.uv,t),d:0});
  const belongsToHand=i=>{let weight=0;for(let k=0;k<4;k++){const bone=rig.skeleton.bones[attrs.skinIndex.getComponent(i,k)];if(/^(wrist|finger\d-\d|lowerarm01)\.R$/.test(bone.name))weight+=attrs.skinWeight.getComponent(i,k);}return weight>.5;};
  for(let i=0;i<index.count;i+=3){
   const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(!ids.every(belongsToHand))continue;
   const tri=ids.map(vertex);if(tri.every(v=>v.d<0))continue;
   const poly=[];
   for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3];if(a.d>=0)poly.push(a);if((a.d>=0)!==(b.d>=0)){const v=blend(a,b,a.d/(a.d-b.d));poly.push(v);boundary.set(v.p.toArray().map(n=>Math.round(n*1e7)).join(','),v);}}
   for(let j=1;j<poly.length-1;j++)vertices.push(poly[0],poly[j],poly[j+1]);
  }
  // Subtract the solid grip from the skin, not just its vertices. Projecting
  // vertices alone still leaves large palm triangles cutting across the axis.
  let compressed=0;const fitted=[];
  for(let i=0;i<vertices.length;i+=3){
   let inside=vertices.slice(i,i+3);
   // The support hand is open and approaches the grip from its side. Only
   // the dominant hand wraps around the shaft, so keep its palm intact.
   if(relaxed){fitted.push(...inside);continue;}
   for(let plane=0;plane<16&&inside.length>=3;plane++){
    const angle=plane/16*Math.PI*2,nx=Math.cos(angle),nz=Math.sin(angle),outside=[],remain=[];
    const signed=v=>(v.p.x-gripCenter.x)*nx+(v.p.z-gripCenter.z)*nz-.0123/size;
    for(let j=0;j<inside.length;j++){
     const a=inside[j],b=inside[(j+1)%inside.length],da=signed(a),db=signed(b);
     (da>=0?outside:remain).push(a);
     if((da>=0)!==(db>=0)){const hit=blend(a,b,da/(da-db));outside.push(hit);remain.push(hit);compressed++;}
    }
    for(let j=1;j<outside.length-1;j++)fitted.push(outside[0],outside[j],outside[j+1]);
    inside=remain;
   }
  }
  // Preserve the anatomical wrist and distal forearm, then extend the exact
  // clipped boundary. No disconnected cylinder or wrist sphere is added.
  const bend=p=>{const out=toView(p),s=Math.max(0,out.x-wristInView.x),angle=Math.min(1,s/.058)*.82;if(s>0){out.x=wristInView.x+s*Math.cos(angle*.5);out.y-=s*Math.sin(angle*.5);}return out;};
  const ring=[...boundary.values()].map(v=>({...v,p:bend(v.p)}));
  const center=ring.reduce((sum,v)=>sum.add(v.p),V()).multiplyScalar(1/ring.length);
  const axis=V(.65,-.75,.10).normalize(),u=V(0,0,1).addScaledVector(axis,-axis.z).normalize(),v=axis.clone().cross(u).normalize();
  ring.sort((a,b)=>{const pa=a.p.clone().sub(center),pb=b.p.clone().sub(center);return Math.atan2(pa.dot(v),pa.dot(u))-Math.atan2(pb.dot(v),pb.dot(u));});
  const ps=[],ns=[],cs=[],uvs=[],append=(p,n,c,uv)=>{ps.push(...p.toArray());ns.push(...n.toArray());cs.push(...c.toArray());uvs.push(uv.x,uv.y);};
  for(const vert of fitted)append(bend(vert.p),vert.n.clone().applyQuaternion(turn),vert.c,vert.uv);
  const skinColor=ring.reduce((sum,p)=>sum.add(p.c),V()).multiplyScalar(1/ring.length);
  let previous=ring.map(p=>p.p),armEnd;const segments=24;
  for(let j=1;j<=segments;j++){
   const t=j/segments,c=center.clone().addScaledVector(axis,t*.34).add(V(.022*t*t,-.018*t*t,.04*t*t));
   const next=ring.map(point=>{
    const offset=point.p.clone().sub(center),theta=Math.atan2(offset.dot(v),offset.dot(u));
    const radius=THREE.MathUtils.lerp(offset.length(),.040+Math.sin(t*Math.PI)*.008,Math.min(1,t*3));
    const round=u.clone().multiplyScalar(Math.cos(theta)*radius*.86).addScaledVector(v,Math.sin(theta)*radius);
    return c.clone().add(offset.lerp(round,Math.min(1,t*4)));
   });
   for(let i=0;i<ring.length;i++){
    const k=(i+1)%ring.length,n=previous[i].clone().sub(c).addScaledVector(axis,-previous[i].clone().sub(c).dot(axis)).normalize();
    for(const tri of [[previous[i],previous[k],next[i]],[next[i],previous[k],next[k]]]){
     const face=tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0]));if(face.dot(n)<0)[tri[1],tri[2]]=[tri[2],tri[1]];
     for(const p of tri)append(p,n,skinColor,new THREE.Vector2(i/ring.length,t));
    }
   }
   previous=next;armEnd=c;
  }
  for(let i=0;i<previous.length;i++){
   const tri=[armEnd,previous[i],previous[(i+1)%previous.length]];
   const face=tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0]));if(face.dot(axis)<0)[tri[1],tri[2]]=[tri[2],tri[1]];
   for(const p of tri)append(p,axis,skinColor,new THREE.Vector2(.5,1));
  }
  // Weld the baked skin and extension for deformation-correct smooth normals.
  // Averaging bind-pose normals across bent knuckles leaves false hard dents.
  const welded=[],map=new Map(),indices=[],colors=[],texcoords=[];
  for(let i=0;i<ps.length;i+=3){const key=ps.slice(i,i+3).map(n=>Math.round(n*1e6)).join(',');let id=map.get(key);if(id===undefined){id=welded.length/3;map.set(key,id);welded.push(...ps.slice(i,i+3));colors.push(...cs.slice(i,i+3));texcoords.push(...uvs.slice(i/3*2,i/3*2+2));}indices.push(id);}
  const geometry=new THREE.BufferGeometry();
  for(const [name,values,count] of [['position',welded,3],['color',colors,3],['uv',texcoords,2]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,count));
  const neighbors=Array.from({length:welded.length/3},()=>new Set());
  for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3];neighbors[a].add(b);neighbors[b].add(a);}
  for(let iteration=0;iteration<3;iteration++){
   const next=[...welded];
   for(let i=0;i<neighbors.length;i++){
    const point=V(...welded.slice(i*3,i*3+3));if(Math.hypot(point.x,point.z)<.015)continue;
    const average=V();for(const n of neighbors[i])average.add(V(...welded.slice(n*3,n*3+3)));average.multiplyScalar(1/neighbors[i].size);
    point.lerp(average,.24);next.splice(i*3,3,...point.toArray());
   }
   welded.splice(0,welded.length,...next);
  }
  // Close the tiny triangle holes left where multiple clipped edges meet at
  // the wrist. Grip contact boundaries stay open underneath the opaque grip.
  const edgeCounts=new Map();
  for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');const edge=edgeCounts.get(key)||{a,b,count:0};edge.count++;edgeCounts.set(key,edge);}
  const edges=[...edgeCounts.values()].filter(e=>e.count===1&&welded[e.a*3]>.1&&welded[e.b*3]>.1),adj=new Map();
  for(const {a,b} of edges){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
  const seen=new Set();let wristPatches=0;
  for(const start of adj.keys())if(!seen.has(start)){
   const loop=[],stack=[start];while(stack.length){const a=stack.pop();if(seen.has(a))continue;seen.add(a);loop.push(a);for(const b of adj.get(a)||[])if(!seen.has(b))stack.push(b);}
   if(loop.length<3||loop.length>8)continue;
   const mid=loop.reduce((sum,id)=>sum.add(V(...welded.slice(id*3,id*3+3))),V()).multiplyScalar(1/loop.length),id=welded.length/3;welded.push(...mid.toArray());colors.push(...skinColor.toArray());texcoords.push(.5,.5);
   for(const edge of edges)if(loop.includes(edge.a)&&loop.includes(edge.b)){indices.push(edge.b,edge.a,id);wristPatches++;}
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(welded,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(texcoords,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const smooth=new Map(),attr=geometry.attributes.position,normalAttr=geometry.attributes.normal;
  for(let i=0;i<attr.count;i++){const key=[attr.getX(i),attr.getY(i),attr.getZ(i)].map(n=>Math.round(n*1e6)).join(',');if(!smooth.has(key))smooth.set(key,{indices:[],normal:V()});const item=smooth.get(key);item.indices.push(i);item.normal.add(V().fromBufferAttribute(normalAttr,i));}
  for(const item of smooth.values()){item.normal.normalize();for(const i of item.indices)normalAttr.setXYZ(i,...item.normal.toArray());}
  geometry.computeBoundingSphere();
  const refined=refineSkin(THREE,geometry,2);geometry.dispose();
  const mesh=new THREE.Mesh(refined,mat);mesh.name='Continuous forearm';mesh.userData.handSurface=relaxed?'Open support hand':'Anatomical grip hand';mesh.userData.wristSeamGap=0;mesh.userData.boundaryVertices=ring.length;mesh.userData.capTriangles=previous.length;
  const fingerJoints={};for(let f=1;f<=5;f++)for(let p=1;p<=3;p++)fingerJoints[`${f}-${p}`]=rig.bones[`finger${f}-${p}.R`].getWorldPosition(V()).sub(wrist).applyQuaternion(canonical).toArray();
  return {mesh,armEnd,axis,compressed,ringCount:segments+1,fingerJoints};
 }
 const hand=bake();root.add(hand.mesh);root.userData.hand=hand.mesh;
 const racket=createRacket(true);racket.scale.setScalar(.96);root.add(racket);root.userData.racketModel=racket;root.userData.head=V(0,.4896,0);
 root.userData.gripReport={handleAxis:[0,gripY,0],wrist:wristInView.toArray(),contactIntersections:hand.compressed,minimumSkinRadius:.0123,boundaryVertices:hand.mesh.userData.boundaryVertices};
 const fabric=new THREE.MeshPhysicalMaterial({color:'#dce3df',roughness:.9,sheen:.5});
 function sleeve(parent,baked){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.049,.14,40,8,true),fabric);mesh.name='Rounded sleeve';mesh.quaternion.setFromUnitVectors(V(0,1,0),baked.axis);mesh.position.copy(baked.armEnd).addScaledVector(baked.axis,.015);mesh.userData.maxRadius=.049;mesh.userData.ringCount=25;parent.add(mesh);}
 sleeve(root,hand);root.userData.armMeshes=[hand.mesh];
 const support=new THREE.Group(),open=bake(true);support.add(open.mesh);sleeve(support,open);support.scale.x=-1;root.userData.support=support;
 for(const group of [root,support])group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 rig.root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(m!==mat)m.dispose();});
 return root;
}
