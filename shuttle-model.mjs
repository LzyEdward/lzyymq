// Sixteen individually curved feather vanes, merged into one lightweight mesh.
export function createShuttleModel(T,mergeGeometries){
 const root=new T.Group(),v=(...a)=>new T.Vector3(...a),batches=new Map();
 function part(geometry,material,position=[0,0,0],rotation=null){
  const m=new T.Mesh(geometry,material);m.position.fromArray(position);if(rotation)m.rotation.fromArray(rotation);m.updateMatrix();geometry.applyMatrix4(m.matrix);
  if(!batches.has(material))batches.set(material,[]);batches.get(material).push(geometry);
 }
 const corkGrain=new Uint8Array(64*64*4);let seed=1287;
 for(let i=0;i<64*64;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const pore=seed%97===0?-.22:(seed/4294967296-.5)*.045;for(let k=0;k<3;k++)corkGrain[i*4+k]=Math.round(255*Math.max(0,Math.min(1,1+pore)));corkGrain[i*4+3]=255;}
 const corkMap=new T.DataTexture(corkGrain,64,64,T.RGBAFormat);corkMap.needsUpdate=true;
 const cork=new T.MeshStandardMaterial({color:'#e0d4bb',map:corkMap,roughness:.9,emissive:'#ded1b3',emissiveIntensity:.04});
 const feathers=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,side:T.DoubleSide,emissive:'#d3d5ca',emissiveIntensity:.1});
 const stems=new T.MeshStandardMaterial({color:'#d1c7a9',roughness:.88});
 const green=new T.MeshStandardMaterial({color:'#345a45',roughness:.7});
 const tip=new T.SphereGeometry(.013,16,10);tip.scale(1,.9,1);part(tip,cork,[0,-.012,0]);
 part(new T.CylinderGeometry(.013,.013,.014,16),cork,[0,-.004,0]);
 part(new T.CylinderGeometry(.0135,.0135,.005,20),green,[0,.005,0]);
 function stem(a,b,r=.00042){const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),d.normalize()));part(g,stems,a.clone().add(b).multiplyScalar(.5).toArray());}
 const barbPoints=[];
 for(let f=0;f<16;f++){
  const angle=f/16*Math.PI*2,positions=[],colors=[],uv=[],indices=[],steps=14;
  function surface(t,side){const rise=Math.min(1,t/.58),spread=rise*rise*(3-2*rise),round=Math.max(0,(t-.85)/.15),phi=angle+t*.075,r=.018+t*.015+(.0006*(1-side*side)),width=(.0017+.0049*spread)*(1-.07*round);return v(Math.sin(phi)*r+Math.cos(phi)*width*side,.035+t*.037-.0016*side*side*round*round,Math.cos(phi)*r-Math.sin(phi)*width*side);}
  for(let j=0;j<=steps;j++)for(let k=0;k<3;k++){
   const t=j/steps,s=k-1;positions.push(...surface(t,s).toArray());uv.push(k/2,t);
   const shade=.88+(1-Math.abs(s))*.065+t*.035;colors.push(shade,shade,shade*.975);
  }
  for(let j=0;j<steps;j++)for(let k=0;k<2;k++){const a=j*3+k,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}
  const vane=new T.BufferGeometry();vane.setAttribute('position',new T.Float32BufferAttribute(positions,3));vane.setAttribute('color',new T.Float32BufferAttribute(colors,3));vane.setAttribute('uv',new T.Float32BufferAttribute(uv,2));vane.setIndex(indices);vane.computeVertexNormals();part(vane,feathers);
  const start=v(Math.sin(angle)*.008,.008,Math.cos(angle)*.008),end=surface(.98,0);stem(start,end);
  for(let j=2;j<12;j++){const t=j/14;for(const side of [-1,1]){const a=surface(t,0),b=surface(t+.055,side*.9);a.multiplyScalar(1.001);b.multiplyScalar(1.001);barbPoints.push(...a.toArray(),...b.toArray());}}
 }
 for(const [y,r] of [[.034,.019],[.043,.024]])part(new T.TorusGeometry(r,.0006,4,32),stems,[0,y,0],[Math.PI/2,0,0]);
 for(const [material,geometries] of batches){
  const geometry=mergeGeometries(geometries,false);if(!geometry)throw new Error('羽毛球几何合并失败');
  root.add(new T.Mesh(geometry,material));for(const old of geometries)old.dispose();
 }
 const barbs=new T.BufferGeometry();barbs.setAttribute('position',new T.Float32BufferAttribute(barbPoints,3));root.add(new T.LineSegments(barbs,new T.LineBasicMaterial({color:'#cfd1c6',transparent:true,opacity:.24})));
 root.name='16-feather cork shuttle';root.userData={featherCount:16,drawCalls:root.children.length,axis:'cork-down'};
 return root;
}
