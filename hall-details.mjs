export function dressHall(T,scene){
 const v=(x,y,z)=>new T.Vector3(x,y,z),dark=new T.MeshStandardMaterial({color:'#304744',roughness:.48,metalness:.52}),wood=new T.MeshStandardMaterial({color:'#9d7853',roughness:.63}),white=new T.MeshStandardMaterial({color:'#e0e2d5',roughness:.84}),rubber=new T.MeshStandardMaterial({color:'#25413c',roughness:.95});
 function mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
 const box=(w,h,d,m,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 function bar(a,b,r=.018,m=dark){const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,...a.clone().add(b).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;}
 // Umpire's high chair and access ladder beside the post, outside the runoff.
 const x=4.8,z=-.15;
 for(const side of [-1,1]){
  bar(v(x+side*.31,.03,z-.4),v(x+side*.25,1.7,z-.15),.023);
  bar(v(x+side*.31,.03,z+.45),v(x+side*.25,1.7,z+.15),.023);
  bar(v(x+side*.25,1.62,z-.18),v(x+side*.25,2.15,z-.18),.018);
 }
 box(.59,.065,.5,wood,x,1.66,z);box(.58,.34,.045,wood,x,1.95,z-.18);
 for(let i=0;i<5;i++)bar(v(x-.3,.25+i*.26,z+.41-i*.042),v(x+.3,.25+i*.26,z+.41-i*.042),.025);
 box(.75,.025,.85,rubber,x,.005,z);
 // Open training basket, spare feather shuttles, and a tube of new shuttles.
 const bx=-5.0,bz=1.25;
 for(const s of [-1,1])for(const t of [-1,1])bar(v(bx+s*.27,.04,bz+t*.22),v(bx+s*.27,.86,bz+t*.22),.012);
 for(const h of [.59,.72,.85])for(const side of [-1,1]){bar(v(bx-.28,h,bz+side*.23),v(bx+.28,h,bz+side*.23),.008);bar(v(bx+side*.28,h,bz-.23),v(bx+side*.28,h,bz+.23),.008);}
 for(let i=0;i<7;i++){const xx=bx-.23+i*.075;bar(v(xx,.59,bz-.23),v(xx,.85,bz-.23),.004);bar(v(xx,.59,bz+.23),v(xx,.85,bz+.23),.004);}
 for(let i=0;i<13;i++){const a=i*2.4,xx=bx+Math.sin(a)*.18,zz=bz+Math.cos(a)*.14;const f=mesh(new T.ConeGeometry(.032,.072,16,1,true),white,xx,.66+(i%3)*.035,zz);f.rotation.set(.5+Math.sin(a),a,.6);}
 mesh(new T.CylinderGeometry(.038,.038,.4,16),white,-5.3,.2,2.1);
 box(.36,.02,.54,rubber,-5.3,.01,2.1);
 // Wall clock and quiet equipment details keep the hall from feeling like an empty box.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#e1e4da';c.fillRect(0,0,256,256);c.translate(128,128);c.strokeStyle='#2d423d';
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,r=i%5?108:100;c.lineWidth=i%5?1:4;c.beginPath();c.moveTo(Math.sin(a)*r,-Math.cos(a)*r);c.lineTo(Math.sin(a)*115,-Math.cos(a)*115);c.stroke();}
 for(const [a,len,width] of [[Math.PI*.4,63,7],[Math.PI*1.18,90,4]]){c.lineWidth=width;c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(a)*len,-Math.cos(a)*len);c.stroke();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const clock=mesh(new T.CircleGeometry(.36,48),new T.MeshStandardMaterial({map:tex,roughness:.55}),8,3.45,-17.55);clock.castShadow=false;
 const frame=mesh(new T.TorusGeometry(.37,.018,8,48),dark,8,3.45,-17.57);
 const towel=new T.MeshStandardMaterial({color:'#adbfb4',roughness:1});box(.37,.025,.4,towel,8.1,.53,-10.5);box(.37,.26,.025,towel,8.1,.4,-10.23);
 // Baked soft contact shadows for furniture that doesn't need another shadow light.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const s=shadowCanvas.getContext('2d'),gradient=s.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'#071b174f');gradient.addColorStop(.5,'#071b1724');gradient.addColorStop(1,'#071b1700');s.fillStyle=gradient;s.fillRect(0,0,128,128);
 const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
 for(const [x,z,w,d] of [[-8.5,-10.5,5,1.2],[8.5,-10.5,5,1.2],[9.8,9,5,1.2],[4.8,-.15,1.1,1.1],[-5,1.25,.9,.8]]){const p=mesh(new T.PlaneGeometry(w,d),shadowMat,x,-.047,z);p.rotation.x=-Math.PI/2;p.castShadow=p.receiveShadow=false;}
}
