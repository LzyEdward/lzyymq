// Deliberately independent of Three and the game module graph. A failed module
// request must produce a useful retry screen instead of an eternal loading veil.
const query=new URLSearchParams(location.search),loading=document.querySelector('#loading');
const label=document.querySelector('#load-status'),detail=document.querySelector('#load-detail');
const errorPanel=document.querySelector('#error-panel'),errorMessage=document.querySelector('#error-message');
let ready=false,stage='连接游戏文件',watchdog;
function fail(message){
 if(ready)return;
 clearTimeout(watchdog);loading.classList.add('hidden');errorPanel.classList.remove('hidden');errorMessage.textContent=message;
 document.body.dataset.boot='error';
}
function progress(message,percent){
 stage=message;label.textContent=message;loading.style.setProperty('--load-progress',`${percent}%`);
 document.body.dataset.bootStage=message;
 clearTimeout(watchdog);watchdog=setTimeout(()=>fail(`“${stage}”等待时间过长。可能是网络资源或浏览器图形初始化未完成，可以重试或选择低负载启动。`),35000);
}
window.addEventListener('court-boot',event=>{
 const info=event.detail;
 if(info.error){fail(info.error);return;}
 if(info.ready){ready=true;clearTimeout(watchdog);document.body.dataset.boot='ready';errorPanel.classList.add('hidden');loading.classList.add('fade');setTimeout(()=>loading.classList.add('hidden'),350);return;}
 if(info.warning){detail.textContent='部分细节资源未完成，已使用轻量模型继续启动。';return;}
 progress(info.stage,info.percent);
});
document.querySelector('#boot-retry').onclick=()=>location.reload();
document.querySelector('#boot-safe').onclick=()=>{const url=new URL(location.href);url.searchParams.set('safe','1');location.href=url.href;};
window.addEventListener('error',event=>{if(!ready&&event.message)fail(`启动出错：${event.message}。请重试；这并不一定是显卡驱动问题。`);});
window.addEventListener('unhandledrejection',event=>{if(!ready)fail(`启动未完成：${event.reason?.message||'资源加载失败'}。请重试或选择低负载启动。`);});
progress('连接游戏文件',6);
detail.textContent=query.has('safe')?'低负载启动：先进入球场，减少初次加载。':'第一次进入需要加载球馆与人物，请稍候。';
import('./game.js?v=7.1.0').catch(error=>fail(`游戏文件未加载完成：${error.message}。请检查网络后重试，或选择低负载启动。`));
