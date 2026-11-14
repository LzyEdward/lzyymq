import {RACKET_SKINS,racketSkin} from './racket-catalog.mjs?v=99e3093fcfbf9bed';
import {createRacketModel,disposeRacketModel} from './racket-model.mjs?v=bb93980d9d4d9ea1';

// The collection borrows the existing camera/renderer. It redraws only on input.
export function createRacketGallery(T,{camera,getSkin,applySkin,invalidate,onOpen,onClose}){
 const dialog=document.createElement('dialog');dialog.id='racket-gallery';dialog.setAttribute('aria-labelledby','collection-title');
 dialog.innerHTML=`<div class="racket-stage" aria-label="拖动旋转球拍三维预览"><div class="collection-caption"><span>THE RACKET COLLECTION / 08</span><h2 id="collection-title">球拍收藏</h2><p>细看每一拍。</p></div><div class="racket-turn"><button type="button" data-turn="-.35" aria-label="向左转动球拍">↶</button><span>拖动旋转 · 滚轮缩放</span><button type="button" data-turn=".35" aria-label="向右转动球拍">↷</button></div></div><section class="collection-panel"><button type="button" class="collection-close" aria-label="关闭球拍收藏">×</button><span class="collection-kicker">选一支，带上场。</span><h3 id="collection-name"></h3><p id="collection-edition"></p><div class="racket-grid">${Object.entries(RACKET_SKINS).map(([id,s])=>`<button type="button" data-skin="${id}" aria-pressed="false"><i style="--rim:${s.palette.rim};--base:${s.palette.carbon};--accent:${s.palette.gold}"></i><span>${s.label}<small>${s.edition}</small></span><b aria-hidden="true">✓</b></button>`).join('')}</div><p class="collection-note">涂装只改变外观，实力与手感由原有参数决定。<br>参考产品外观制作的游戏涂装。</p><button type="button" class="btn-primary collection-done">带上这支球拍 <span>→</span></button></section>`;
 document.body.append(dialog);
 let preview=null,saved=null,drag=null,zoom=1,yaw=-.24;
 function position(){if(!preview)return;const narrow=innerWidth<720,depth=narrow?1.9:1.7,height=2*depth*Math.tan(46*Math.PI/360);preview.position.set(narrow?0:-height*camera.aspect*.18,narrow?.055:-.47,-depth);preview.scale.setScalar((narrow?.95:1.55)*zoom);preview.rotation.set(.05,yaw,-.13);invalidate();}
 function select(id){
  if(preview){camera.remove(preview);disposeRacketModel(preview);}
  preview=createRacketModel(T,{skin:id,player:true});
  // A restrained preview fill on the model avoids recompiling the entire hall
  // with another light. No material from the equipped racket is shared here.
  preview.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){if(!m.emissive)continue;m.emissive.copy(m.color);m.emissiveMap=m.map;m.emissiveIntensity=.16;}});
  camera.add(preview);position();
  applySkin(id);const skin=racketSkin(id);dialog.querySelector('#collection-name').textContent=skin.model;dialog.querySelector('#collection-edition').textContent=skin.edition;
  for(const b of dialog.querySelectorAll('[data-skin]'))b.setAttribute('aria-pressed',String(b.dataset.skin===id));
 }
 function close(){if(dialog.open)dialog.close();}
 dialog.querySelector('.collection-close').onclick=close;dialog.querySelector('.collection-done').onclick=close;
 for(const b of dialog.querySelectorAll('[data-skin]'))b.onclick=()=>select(b.dataset.skin);
 for(const b of dialog.querySelectorAll('[data-turn]'))b.onclick=()=>{yaw+=Number(b.dataset.turn);position();};
 const stage=dialog.querySelector('.racket-stage');
 stage.onpointerdown=e=>{if(e.target.closest('button'))return;drag=e.clientX;stage.setPointerCapture(e.pointerId);};
 stage.onpointermove=e=>{if(drag===null)return;yaw+=(e.clientX-drag)*.012;drag=e.clientX;position();};
 stage.onpointerup=stage.onpointercancel=()=>drag=null;
 stage.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom-e.deltaY*.0007,.78,1.15);position();},{passive:false});
 dialog.addEventListener('close',()=>{
  if(preview){camera.remove(preview);disposeRacketModel(preview);preview=null;}
  if(saved){camera.position.copy(saved.position);camera.quaternion.copy(saved.rotation);camera.fov=saved.fov;camera.updateProjectionMatrix();saved=null;}
  drag=null;onClose();invalidate();
 });
 window.addEventListener('resize',()=>{if(dialog.open)position();});
 return {dialog,open(){
  if(dialog.open)return;saved={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov};onOpen();
  camera.position.set(0,2.3,7.5);camera.lookAt(0,2.4,-5);camera.fov=46;camera.updateProjectionMatrix();yaw=-.24;zoom=1;
  dialog.showModal();select(getSkin());dialog.querySelector(`[data-skin="${getSkin()}"]`).focus();
 },close};
}
