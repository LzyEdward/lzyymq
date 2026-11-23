// Cross sections of the head, top to chin, in the athlete's metre-scale bind pose.
// The vertical coordinate also locates the corresponding row in the photo atlas.
const rings = [
  [0, .003, .005, .040], [.035, .046, .062, .040], [.09, .067, .085, .043],
  [.18, .082, .099, .045], [.30, .088, .103, .046], [.42, .088, .101, .046],
  [.52, .085, .098, .046], [.64, .083, .094, .048], [.74, .080, .090, .050],
  [.83, .074, .084, .053], [.91, .063, .073, .057], [.97, .044, .055, .068],
  [1, .012, .016, .085]
];

export function createPortraitHead(THREE, texture, headOrigin) {
  const group = new THREE.Group();
  group.name = '林楠 · 照片头模';
  group.position.copy(headOrigin).multiplyScalar(-1);
  const positions = [], uv = [], indices = [];
  const columns = 80, rows = 56;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const end = rings.findIndex((ring, i) => i > 0 && ring[0] >= t);
    const a = rings[end - 1], b = rings[end];
    const mix = (t - a[0]) / (b[0] - a[0]);
    const interpolate = i => a[i] + (b[i] - a[i]) * mix;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns, angle = (u - .5) * Math.PI * 2;
      const x = Math.sin(angle) * interpolate(1), forward = Math.cos(angle);
      const jaw = THREE.MathUtils.smoothstep(t,.74,.99);
      const y = 1.82 - t * .257 + jaw*(1-forward)*.014;
      let z = interpolate(3) + forward * interpolate(2);
      if (forward > 0) {
        const bump = (cx, cy, width, height) => Math.exp(-(((x-cx)/width)**2 + ((t-cy)/height)**2));
        const nose = .013*bump(0,.59,.011,.105) + .023*bump(0,.674,.014,.038);
        const eyes = -.008*bump(Math.sign(x)*.037,.51,.018,.041);
        const cheeks = .005*bump(Math.sign(x)*.046,.65,.025,.09);
        z += forward * (nose + eyes + cheeks + .007*bump(0,.83,.03,.044));
      }
      positions.push(x,y,z);
      uv.push(u,1-t);
      if (row < rows && col < columns) {
        const i = row*(columns+1)+col, below = i+columns+1;
        indices.push(i,below,i+1,i+1,below,below+1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({map:texture,roughness:.91,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.28});
  function attach(geometry, material) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  attach(geometry,face);
  const cushion = new THREE.MeshStandardMaterial({color:0x242221,roughness:.83});
  const housing = new THREE.MeshStandardMaterial({color:0x302e2d,metalness:.28,roughness:.45});
  const metal = new THREE.MeshStandardMaterial({color:0xb69e68,metalness:.55,roughness:.35});
  const wire = new THREE.MeshStandardMaterial({color:0x373438,metalness:.35,roughness:.46});
  const vec = (x,y,z) => new THREE.Vector3(x,y,z);
  function pad(material,x,y,z,rx,ry,rz) {
    const mesh = attach(new THREE.SphereGeometry(1,28,20),material);
    mesh.position.set(x,y,z);
    mesh.scale.set(rx,ry,rz);
    return mesh;
  }
  function arc(material,points,radius) {
    return attach(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,8,false),material);
  }
  for (const side of [-1,1]) {
    pad(cushion,side*.085,1.682,.043,.018,.048,.038);
    pad(housing,side*.097,1.683,.043,.013,.045,.035);
    pad(metal,side*.105,1.686,.041,.006,.038,.029);
    pad(housing,side*.108,1.686,.041,.005,.034,.025);
    arc(metal,[vec(side*.101,1.69,.070),vec(side*.103,1.727,.060),vec(side*.096,1.755,.044)],.0028);
    arc(wire,[vec(side*.078,1.694,.090),vec(side*.084,1.694,.079),vec(side*.088,1.688,.050)],.0015);
  }
  const band = [];
  for (let i=0;i<=20;i++) {
    const angle = (i/20)*Math.PI;
    band.push(vec(.101*Math.cos(angle),1.70+.122*Math.sin(angle),.042));
  }
  const bridge = arc(housing,band,.006);
  // Flatten the padded headband vertically and give it depth from front to back.
  const vertex = bridge.geometry.attributes.position;
  for (let i=0;i<vertex.count;i++) vertex.setZ(i,.042+(vertex.getZ(i)-.042)*2.3);
  bridge.geometry.computeVertexNormals();
  return group;
}

// Sew the lower edge to the shirt vertices using their original bone weights.
// The upper edge sits inside the jaw and follows the head as the player looks up.
export function createPortraitNeck(THREE,torso,neckBone,headBone){
  const {position,skinIndex,skinWeight,necklineDistance}=torso.geometry.attributes;
  const rim=new Map();
  for(const id of torso.geometry.index.array){
    if(necklineDistance.getX(id)>1e-6)continue;
    const x=position.getX(id), y=position.getY(id), z=position.getZ(id);
    rim.set([x,y,z].join(','),{id,x,y,z,angle:Math.atan2(x,z-.011)});
  }
  const edge=[...rim.values()].sort((a,b)=>a.angle-b.angle);
  const pos=[],normals=[],bones=[],weights=[],indices=[];
  const sections=[[1.553,.065,.059,.018],[1.582,.056,.055,.024],[1.61,.055,.057,.035],[1.651,.057,.057,.039]];
  for(let layer=0;layer<=sections.length;layer++)for(let i=0;i<edge.length;i++){
    const {id,x,y,z,angle}=edge[i];
    // Unevenly spaced seam vertices must still light as a smooth neck.
    const normal=new THREE.Vector3(Math.sin(angle),[.52,.30,.03,-.06,-.05][layer],Math.cos(angle)*1.08).normalize();
    normals.push(normal.x,normal.y,normal.z);
    if(layer===0){
      pos.push(x,y,z);
      for(let j=0;j<4;j++){bones.push(skinIndex.getComponent(id,j));weights.push(skinWeight.getComponent(id,j));}
    }else{
      const [height,rx,rz,center]=sections[layer-1];
      pos.push(rx*Math.sin(angle),height,center+rz*Math.cos(angle));
      const headWeight=(layer-1)/(sections.length-1);
      bones.push(neckBone,headBone,0,0);weights.push(1-headWeight,headWeight,0,0);
    }
    if(layer<sections.length){
      const a=layer*edge.length+i,b=layer*edge.length+(i+1)%edge.length;
      indices.push(a,b,a+edge.length,b,b+edge.length,a+edge.length);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(bones,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  g.setIndex(indices);
  return new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial({color:0xb88a73,roughness:.9}));
}
