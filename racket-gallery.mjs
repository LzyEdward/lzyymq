import {RACKET_SKINS,SERIES,racketSkin,canEquipRacket} from './racket-catalog.mjs';
import {createRacketModel,disposeRacketModel} from './racket-model.mjs';

const entries=Object.entries(RACKET_SKINS);

export function createRacketGallery(T,{getSkin,getTitleEvent,applySkin,invalidate,onOpen,onClose}){
 const studio=new T.Scene(),camera=new T.PerspectiveCamera(46,1,.05,8);
 studio.background=new T.Color('#667a73');
 const key=new T.DirectionalLight('#fff1dd',2.1);key.position.set(-2,3,4);
 const rim=new T.DirectionalLight('#c5dcff',1.4);rim.position.set(2,1,-3);
 studio.add(camera,key,rim,new T.HemisphereLight('#ffffff','#a6aca4',1.4));
 const dialog=document.createElement('dialog');
 dialog.id='racket-gallery';
 dialog.setAttribute('aria-labelledby','collection-title');
 dialog.innerHTML=`
  <div class="racket-stage" aria-label="拖动旋转球拍">
   <div class="collection-caption"><h2 id="collection-title">球拍收藏</h2><p id="collection-count"></p></div>
   <div class="racket-turn"><button type="button" data-turn="-.35" aria-label="向左转动球拍">↶</button><select class="racket-framing" aria-label="预览细节"><option value="full">整拍</option><option value="shaft">中杆印字</option><option value="cone">握把锥盖</option></select><button type="button" data-turn=".35" aria-label="向右转动球拍">↷</button></div>
  </div>
  <section class="collection-panel">
   <button type="button" class="collection-close" aria-label="关闭球拍收藏">×</button>
   <label class="collection-filters">系列 <select aria-label="筛选球拍系列"><option value="">全部系列</option></select></label>
   <div class="racket-grid" role="group" aria-label="选择球拍预览"></div>
   <div class="collection-selection" aria-live="polite"><h3 id="collection-name"></h3><p id="collection-edition"></p></div>
   <button type="button" class="btn-primary collection-done"></button>
  </section>`;
 document.body.append(dialog);
 const stage=dialog.querySelector('.racket-stage'),grid=dialog.querySelector('.racket-grid');
 const filter=dialog.querySelector('.collection-filters select'),framing=dialog.querySelector('.racket-framing'),equip=dialog.querySelector('.collection-done');
 for(const [id,name] of Object.entries(SERIES))filter.add(new Option(name+' · '+id,id));
 let preview=null,selected='',drag=null,zoom=1,yaw=-.24,title=null;
 function position(){
  if(!preview)return;
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  const area=stage.getBoundingClientRect(),depth=1.7,height=2*depth*Math.tan(camera.fov*Math.PI/360);
  const available=Math.max(70,area.height-(area.height<390?70:128));
  const focus=framing.value;
  const scale=Math.min(available/.69,area.width*.74/.26)*height/innerHeight*zoom*(focus==='full'?1:focus==='shaft'?5:9);
  const x=((area.left+area.width/2)/innerWidth-.5)*height*camera.aspect;
  const y=(.5-(area.top+area.height*.50)/innerHeight)*height;
  preview.scale.setScalar(scale);preview.rotation.set(.05,yaw,-.13);
  const center=new T.Vector3(0,focus==='cone'?.174:focus==='shaft'?.276:.32,0).multiplyScalar(scale).applyEuler(preview.rotation);
  preview.position.set(x,y,-depth).sub(center);invalidate();
 }
 function clearPreview(){
  if(!preview)return;
  camera.remove(preview);disposeRacketModel(preview);preview=null;
 }
 function select(id){
  if(!preview||selected!==id){
   clearPreview();selected=id;
   preview=createRacketModel(T,{skin:id,player:true,titleName:title?.name});
   camera.add(preview);position();
  }
  const spec=racketSkin(id),allowed=canEquipRacket(id,title);
  dialog.querySelector('#collection-name').textContent=spec.label;
  dialog.querySelector('#collection-edition').textContent=spec.unlock?(title?'首冠铭刻 · '+title.name:'赢得首个巡回赛事冠军后解锁'):spec.model+' · '+spec.edition;
  equip.disabled=!allowed;
  equip.textContent=!allowed?'首冠后解锁':id===getSkin()?'已装备 · 返回':'带上这支球拍 →';
  for(const b of grid.children)b.setAttribute('aria-pressed',String(b.dataset.skin===id));
 }
 function showFamily(preferred){
  grid.replaceChildren();
  for(const [id,s] of entries){
   if(filter.value&&s.family!==filter.value)continue;
   const b=document.createElement('button');
   b.type='button';b.dataset.skin=id;
   b.style.setProperty('--rim',s.palette.rim);b.style.setProperty('--base',s.palette.carbon);b.style.setProperty('--accent',s.palette.gold);
   const state=id===getSkin()?'已装备':canEquipRacket(id,title)?'':'待解锁';
   b.innerHTML=`<i aria-hidden="true"></i><span>${s.label}<small>${s.edition}</small></span><b>${state}</b>`;
   b.onclick=()=>select(id);grid.append(b);
  }
  const button=Array.from(grid.children).find(b=>b.dataset.skin===preferred)||grid.firstElementChild;
  select(button.dataset.skin);button.scrollIntoView({block:'nearest'});
 }
 function close(){if(dialog.open)dialog.close();}
 equip.onclick=()=>{
  if(!canEquipRacket(selected,getTitleEvent()))return;
  if(selected!==getSkin())applySkin(selected);
  close();
 };
 filter.onchange=()=>showFamily(selected);
 framing.onchange=()=>{
  zoom=1;
  yaw=framing.value==='cone'?-Math.PI/2:framing.value==='shaft'?(racketSkin(selected).unlock?-1.96:2.60):-.24;
  position();
 };
 dialog.querySelector('.collection-close').onclick=close;
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 for(const b of dialog.querySelectorAll('[data-turn]'))b.onclick=()=>{yaw+=Number(b.dataset.turn);position();};
 stage.onpointerdown=e=>{if(!e.isPrimary||e.target.closest('button,select'))return;drag=e.clientX;stage.setPointerCapture(e.pointerId);};
 stage.onpointermove=e=>{if(!e.isPrimary||drag===null)return;yaw+=(e.clientX-drag)*.012;drag=e.clientX;position();};
 stage.onlostpointercapture=stage.onpointerup=stage.onpointercancel=()=>drag=null;
 stage.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom-e.deltaY*.0007,.78,1.15);position();},{passive:false});
 dialog.addEventListener('close',()=>{
  clearPreview();
  drag=null;onClose();invalidate();
 });
 window.addEventListener('resize',()=>{if(dialog.open)position();});
 return {dialog,open(){
  if(dialog.open)return;
  onOpen();
  yaw=-.24;zoom=1;title=getTitleEvent();filter.value='';framing.value='full';
  dialog.querySelector('#collection-count').textContent=entries.filter(([id])=>canEquipRacket(id,title)).length+' / '+entries.length+' 款已收藏';
  dialog.showModal();showFamily(getSkin());filter.focus({preventScroll:true});
 },close,render(renderer){renderer.render(studio,camera);}};
}
