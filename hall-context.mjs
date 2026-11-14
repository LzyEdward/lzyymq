// Six recessed window bays per side. The end walls stay solid.
export const WINDOW_BAYS=Object.freeze([-12.5,-7.5,-2.5,2.5,7.5,12.5]);

export function createHallContext(T,scene){
 const metal=new T.MeshStandardMaterial({color:'#82918c',roughness:.43,metalness:.55}),dark=new T.MeshStandardMaterial({color:'#2c3b37',roughness:.85}),concrete=new T.MeshStandardMaterial({color:'#8e978b',roughness:.96});
 const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;};
 const box=(w,h,d,m,x,y,z)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 // Shared alpha-tested leaf clusters retain irregular silhouettes and gaps.
 const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=512;const lc=leafCanvas.getContext('2d');
 let foliageSeed=93721;const leafRand=()=>{foliageSeed=(Math.imul(foliageSeed,1664525)+1013904223)>>>0;return foliageSeed/4294967296;};
 for(let cluster=0;cluster<64;cluster++){
  const a=leafRand()*Math.PI*2,r=Math.sqrt(leafRand()),cx=256+Math.cos(a)*r*185,cy=258+Math.sin(a)*r*173;
  for(let leaf=0;leaf<68;leaf++){
   const angle=leafRand()*Math.PI*2,rad=Math.sqrt(leafRand())*43,x=cx+Math.cos(angle)*rad,y=cy+Math.sin(angle)*rad;
   const tone=Math.floor(leafRand()*47);lc.fillStyle=`rgb(${80+tone},${102+tone},${70+tone})`;
   lc.beginPath();lc.ellipse(x,y,2+leafRand()*3.8,1.3+leafRand()*2.1,leafRand()*Math.PI,0,Math.PI*2);lc.fill();
  }
 }
 const foliage=new T.CanvasTexture(leafCanvas);foliage.colorSpace=T.SRGBColorSpace;foliage.generateMipmaps=true;foliage.minFilter=T.LinearMipmapLinearFilter;
 const leaves=['#afc4a9','#91b89e','#c2c6a1'].map(color=>new T.MeshStandardMaterial({map:foliage,color,alphaTest:.38,side:T.DoubleSide,roughness:1})),bark=new T.MeshStandardMaterial({color:'#68685a',roughness:1});
 const crown=new T.PlaneGeometry(3.25,2.9),trunk=new T.CylinderGeometry(.065,.11,3.8,7);
 function panorama(side){
  const c=document.createElement('canvas');c.width=2048;c.height=512;const p=c.getContext('2d');let seed=side<0?672:948;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const sky=p.createLinearGradient(0,0,0,512);sky.addColorStop(0,'#a7c1c9');sky.addColorStop(.54,'#dde2d5');sky.addColorStop(1,'#8d9b82');p.fillStyle=sky;p.fillRect(0,0,2048,512);
  // Different continuous views on each side, with distant buildings behind foliage.
  for(let i=0;i<15;i++){
   const x=i*153+rand()*50,y=245+rand()*38,w=75+rand()*90,h=80+rand()*70;
   p.fillStyle=i%3?'#b0b8ae':'#a4b0ac';p.fillRect(x,y-h,w,h);p.fillStyle='#657e7a50';
   for(let yy=y-h+12;yy<y-6;yy+=16)for(let xx=x+9;xx<x+w-6;xx+=16)p.fillRect(xx,yy,7,8);
   p.fillStyle='#d2d4c5';p.fillRect(x-2,y-h-3,w+4,3);
  }
  for(let layer=0;layer<3;layer++)for(let i=0;i<90;i++){
   const x=rand()*2048,y=302+layer*40+rand()*57;p.fillStyle=['#7c9181','#6d836f','#647e66'][layer];p.beginPath();p.ellipse(x,y,12+rand()*41,20+rand()*45,rand()*.7,0,Math.PI*2);p.fill();
  }
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;
  const back=add(new T.PlaneGeometry(44,14),new T.MeshBasicMaterial({map,color:'#c3d1c7'}),side*27,6,0);back.rotation.y=-side*Math.PI/2;back.name='Continuous outdoor panorama '+side;
 }
 for(const side of [-1,1]){
  panorama(side);box(13,.06,38,concrete,side*21.5,-.04,0);
  // Real foreground depth: trunks/crowns shift relative to the distant panorama.
  for(let i=0;i<8;i++){
   const z=-16+i*4.6+(side<0?.6:-.9),x=side*(19.5+(i%3)*.8),height=4.9+(i%3)*.44;
   add(trunk,bark,x,1.9,z);
   for(let k=0;k<3;k++){
    for(let layer=0;layer<3;layer++){const leaf=add(crown,leaves[(i+k)%3],x+Math.sin(i*3+k)*.7,height-.5+k*.38,z+Math.cos(k*2)*.65);leaf.name='Foreground leaf cluster';leaf.scale.set(1+(i%2)*.15,.9+k*.09,1);leaf.rotation.set(0,-side*Math.PI/2+(layer-1)*.78,(k-1)*.14);}
   }
  }
  // Deep sills, reveals, mullion seals and small hardware at believable scale.
  for(const z of WINDOW_BAYS){
   box(.44,.10,4.62,metal,side*14.7,4.35,z);box(.40,.09,4.62,metal,side*14.7,8.67,z);
   for(const dz of [-2.29,2.29])box(.40,4.32,.065,metal,side*14.7,6.5,z+dz);
   for(const dz of [-1.15,0,1.15])box(.07,4.20,.022,dark,side*14.425,6.5,z+dz);
   for(const dz of [-1.73,.57])box(.035,.14,.028,metal,side*14.39,5.12,z+dz);
  }
  for(const z of [-15,-10,-5,0,5,10,15]){
   box(.08,.32,.50,metal,side*14.17,8.91,z);
   for(const dz of [-.17,.17])for(const yy of [8.82,9.0]){const bolt=add(new T.CylinderGeometry(.018,.018,.018,6),dark,side*14.12,yy,z+dz);bolt.rotation.z=Math.PI/2;}
  }
 }
 // Return-air grilles, conduit and door furniture break up the blank end wall.
 for(const x of [-9,9]){
  box(2.3,.85,.12,metal,x,7.2,-17.68);box(2.15,.70,.13,dark,x,7.2,-17.59);
  for(let i=0;i<10;i++)box(2.12,.027,.11,metal,x,6.9+i*.067,-17.50);
 }
 box(28,.05,.045,metal,0,3.18,-17.67);
 for(const x of [-10.2,5.8]){
  box(.38,.68,.018,metal,x,1.86,-17.375);box(.32,.61,.02,dark,x,1.86,-17.36);
  box(.88,.045,.06,metal,x,1.08,-17.30);box(.33,.075,.09,metal,x+.32,2.42,-17.31);
  for(const y of [.35,1.32,2.24])box(.037,.12,.045,metal,x-.68,y,-17.35);
 }
}
