// Extend the two original shorts hems into loose track pants. Existing hem
// vertices keep their skinning weights; each lower ring follows the knee/ankle.
export function extendTrackPants(T,g){
 const a=g.attributes,attrs=Object.fromEntries(Object.entries(a).map(([k,v])=>[k,Array.from(v.array)]));
 const indices=Array.from(g.index.array),edges=new Map(),original=new Map();
 function key(id){return [a.position.getX(id),a.position.getY(id),a.position.getZ(id)].map(v=>v.toFixed(5)).join(',');}
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
  const id=indices[i+j],next=indices[i+(j+1)%3],from=key(id),to=key(next);
  original.set(from,id);const k=[from,to].sort().join('/');
  if(edges.has(k))edges.delete(k);else edges.set(k,[from,to]);
 }
 for(const side of [-1,1]){
  const rim=new Set();
  for(const pair of edges.values())for(const k of pair){
   const id=original.get(k);
   if(a.position.getY(id)<.68&&Math.sign(a.position.getX(id))===side)rim.add(id);
  }
  const center=new T.Vector3(),v=new T.Vector3();
  for(const id of rim)center.add(v.fromBufferAttribute(a.position,id));
  center.divideScalar(rim.size);
  const angle=id=>Math.atan2(a.position.getX(id)-center.x,a.position.getZ(id)-center.z);
  const top=[...rim].sort((a,b)=>angle(a)-angle(b));
  const thigh=g.userData.joints['upperleg01.'+(side===1?'L':'R')],shin=g.userData.joints['lowerleg01.'+(side===1?'L':'R')];
  let last=top;
  for(const [y,cx,cz,rx,rz,weight] of [[.60,.148,.027,.086,.089,.05],[.555,.153,.024,.082,.085,.20],[.51,.159,.019,.081,.081,.50],[.467,.164,.013,.078,.078,.79],[.405,.170,.006,.075,.074,.97],[.30,.180,.001,.068,.067,1],[.19,.190,.001,.059,.059,1],[.137,.195,.006,.059,.057,1],[.113,.198,.009,.053,.052,1],[.105,.198,.009,.052,.051,1]]){
   const ring=[];
   for(const id of top){
    const t=angle(id),wave=Math.cos(t*5+y*18)*.0028+Math.sin(t*3-y*33)*.0018;
    ring.push(attrs.position.length/3);attrs.position.push(side*cx+(rx+wave)*Math.sin(t),y,cz+(rz+wave)*Math.cos(t));
    attrs.normal.push(Math.sin(t),0,Math.cos(t));attrs.uv.push(t/(Math.PI*2)+.5,y);attrs.color.push(1,1,1);
    attrs.skinIndex.push(thigh,shin,0,0);attrs.skinWeight.push(1-weight,weight,0,0);
   }
   for(let j=0;j<top.length;j++){
    const n=(j+1)%top.length;indices.push(last[j],ring[j],last[n],last[n],ring[j],ring[n]);
   }
   last=ring;
  }
 }
 for(const [name,old] of Object.entries(a))g.setAttribute(name,new T.BufferAttribute(new old.array.constructor(attrs[name]),old.itemSize));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
}

export function schoolPolo(T,texture,weave){
 texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const m=new T.MeshPhysicalMaterial({color:'#3859a5',roughness:.9,bumpMap:weave,bumpScale:.00024,sheen:.22});
 m.onBeforeCompile=shader=>{
  shader.uniforms.uPoloPhoto={value:texture};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float necklineDistance; varying float vNeck; varying vec3 vPolo;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvPolo=position;vNeck=necklineDistance;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uPoloPhoto; varying vec3 vPolo; varying float vNeck;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 whiteTrim=vec3(.86,.90,.94);
    float side=smoothstep(.12,.131,abs(vPolo.x))*(1.-smoothstep(.092,.103,abs(vPolo.z)))*(1.-smoothstep(1.28,1.33,vPolo.y));
    float collar=1.-smoothstep(.010,.014,vNeck);
    diffuseColor.rgb=mix(diffuseColor.rgb,whiteTrim,max(side,collar));
    vec2 uv=vec2(.5+vPolo.x/.28,(vPolo.y-1.308)/.202);
    if(vPolo.z>.050&&all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))){
     vec4 detail=texture2D(uPoloPhoto,uv);diffuseColor.rgb=mix(diffuseColor.rgb,detail.rgb,detail.a);
    }
    diffuseColor.rgb*=1.-.085*(1.-smoothstep(.0008,.0027,abs(vPolo.y-.995)));
   `);
 };m.customProgramCacheKey=()=> 'shenzhen-summer-polo';return m;
}

export function schoolTrousers(T,weave){
 const m=new T.MeshPhysicalMaterial({color:'#202d49',roughness:.92,bumpMap:weave,bumpScale:.00025,sheen:.28});
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPants;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPants=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPants;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    float y=vPants.y,center=.209-.101*y;
    float outer=smoothstep(.008,.034,abs(vPants.x)-center);
    float z=vPants.z-mix(.007,.026,smoothstep(.35,.75,y));
    float stripe=1.-smoothstep(.005,.0065,abs(z));
    float piping=1.-smoothstep(.0011,.0025,abs(z+.013));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.81,.86),outer*max(stripe,piping*.84));
    diffuseColor.rgb*=1.-.13*(1.-smoothstep(.001,.003,abs(y-.119)));
   `);
 };m.customProgramCacheKey=()=> 'shenzhen-track-trousers';return m;
}
