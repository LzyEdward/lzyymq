export function racketHeadPoint(angle,inset=0){
 const c=Math.cos(angle),s=Math.sin(angle),n=2.3;
 return [(.104-inset)*Math.sign(c)*Math.abs(c)**(2/n)*(.97+.03*s),.51+(.145-inset)*Math.sign(s)*Math.abs(s)**(2/n),0];
}
// A thin rounded aero-box beam: wider in the string plane than through its
// face. The crown is softer, the lower shoulder retains a boxier section.
export function createRacketFrame(T,segments=192,sides=16){
 const positions=[],uv=[],index=[],V=(a)=>new T.Vector3(...a);
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,center=V(racketHeadPoint(a));
  const tangent=V(racketHeadPoint(a+.0001)).sub(V(racketHeadPoint(a-.0001))).normalize(),outward=new T.Vector3(tangent.y,-tangent.x,0);
  const section=2.3-.55*Math.sin(a),radial=.0047+Math.max(0,-Math.sin(a))*.00025,depth=.00315;
  for(let j=0;j<=sides;j++){
   const theta=j/sides*Math.PI*2,c=Math.cos(theta),s=Math.sin(theta),r=radial*Math.sign(c)*Math.abs(c)**(2/section),z=depth*Math.sign(s)*Math.abs(s)**(2/section);
   positions.push(center.x+outward.x*r,center.y+outward.y*r,z);uv.push(i/segments,j/sides);
   if(i<segments&&j<sides){const k=i*(sides+1)+j;index.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();
 // Normal welding across both periodic seams keeps the clearcoat continuous.
 const normals=geometry.attributes.normal;
 const join=(a,b)=>{const n=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);};
 for(let i=0;i<=segments;i++)join(i*(sides+1),i*(sides+1)+sides);
 for(let j=0;j<=sides;j++)join(j,segments*(sides+1)+j);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
