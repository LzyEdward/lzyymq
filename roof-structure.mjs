// Static, inward-facing insulated metal roof. Corrugation is actual geometry,
// so overhead shots show a lit profile without a full-screen effects pass.
export function roofGeometry(T){
 const width=30,depth=36,nx=480,nz=6,p=[],uv=[],index=[];
 for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
  const xx=-width/2+x/nx*width;
  p.push(xx,10.48+Math.sin(xx*Math.PI*4)*.018,-depth/2+z/nz*depth);
  uv.push(x/nx,z/nz);
 }
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const a=z*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;index.push(a,b,c,b,d,c);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
