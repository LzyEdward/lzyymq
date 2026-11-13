// Static architecture detail: textures are built once and shared by the hall.
// No additional full-screen pass, dynamic reflection or particle simulation.
export function hallSurfaces(T){
 let seed=48391;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function draw(w,h,fn){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;fn(canvas.getContext('2d'),w,h);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;}
 const wall=draw(512,512,(c,w,h)=>{
  c.fillStyle='#b8bdb6';c.fillRect(0,0,w,h);
  for(let i=0;i<22000;i++){const n=Math.floor(167+rand()*43);c.fillStyle=`rgba(${n},${n+3},${n},.16)`;c.fillRect(rand()*w,rand()*h,rand()*2+.5,rand()*2+.5);}
  for(let x=0;x<w;x+=128){c.fillStyle='#151f1622';c.fillRect(x,0,1,h);c.fillStyle='#f7fff42a';c.fillRect(x+1,0,1,h);}
  for(let y=0;y<h;y+=256){c.fillStyle='#1520181e';c.fillRect(0,y,w,1);}
 });wall.wrapS=wall.wrapT=T.RepeatWrapping;wall.repeat.set(4,2);
 const glass=draw(128,256,(c,w,h)=>{
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#a6c3d0');sky.addColorStop(.55,'#dae1da');sky.addColorStop(1,'#768f82');c.fillStyle=sky;c.fillRect(0,0,w,h);
  c.fillStyle='#4f68544d';for(let i=0;i<14;i++){const x=rand()*w,y=h*(.64+rand()*.3);c.beginPath();c.ellipse(x,y,10+rand()*14,15+rand()*25,0,0,Math.PI*2);c.fill();}
  c.fillStyle='#ffffff20';c.beginPath();c.moveTo(w*.2,0);c.lineTo(w*.55,0);c.lineTo(w,h*.7);c.lineTo(w,h);c.fill();
 });
 const court=draw(512,1024,(c,w,h)=>{
  c.fillStyle='#34786c';c.fillRect(0,0,w,h);
  // One atlas spans one court: seams and foot marks no longer repeat in a grid.
  for(let i=0;i<42000;i++){c.fillStyle=i%2?'#eff9e307':'#071f1d09';c.fillRect(rand()*w,rand()*h,rand()*1.4+.4,rand()*1.4+.4);}
  for(const x of [w*.25,w*.5,w*.75]){c.fillStyle='#102d2720';c.fillRect(x,0,.65,h);c.fillStyle='#adc9ae12';c.fillRect(x+.65,0,.6,h);}
  for(const side of [.26,.74])for(let i=0;i<80;i++){
   const x=w*(.5+(rand()-.5)*.64),y=h*(side+(rand()-.5)*.2);c.strokeStyle=i%3?'#c1d4bd0a':'#172f291a';c.lineWidth=.45+rand()*.6;c.beginPath();c.ellipse(x,y,2+rand()*6,.5+rand()*1.5,rand()*Math.PI,0,Math.PI*(.5+rand()*.8));c.stroke();
  }
  // Restrained long wear marks outside the white playing lines.
  c.strokeStyle='#112f2814';c.lineWidth=1;for(let i=0;i<14;i++){const x=w*(i%2?.95:.05),y=rand()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*6-3,y+rand()*18);c.stroke();}
 });
 return {wall,glass,court};
}
