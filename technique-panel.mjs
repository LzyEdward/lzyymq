import { normalizeSkills, SKILL_KEYS } from './player-styles.mjs';

export const SKILL_LABELS=Object.freeze({
 attack:['进攻','杀球速度与连续进攻'],defense:['防守','反应、救球覆盖与接杀'],
 control:['控球','落点精度与回球稳定性'],net:['网前','搓球、勾对角与贴网质量'],
 speed:['步法','启动、移动与回位速度'],stamina:['体能','消耗与回合间恢复'],
});

// Native dialog handles focus containment and returns focus to its launcher.
export function createTechniquePanel({onPlayerChange,onOpponentChange,onResetPlayer,onResetOpponent,onOpen}){
 const dialog=document.createElement('dialog');dialog.id='technique-dialog';
 dialog.setAttribute('aria-labelledby','technique-title');
 const rows=(side,values)=>SKILL_KEYS.map(key=>`<label class="technique-row"><span><b>${SKILL_LABELS[key][0]}</b><small>${SKILL_LABELS[key][1]}</small></span><input aria-label="${side==='player'?'我的':'对手'}${SKILL_LABELS[key][0]}" id="${side}-${key}" type="range" min="40" max="160" step="1" value="${Math.round((values[key]??1)*100)}"><output for="${side}-${key}">${Math.round((values[key]??1)*100)}%</output></label>`).join('');
 dialog.innerHTML=`<div class="technique-header"><div><h2 id="technique-title">实力调节</h2></div><button id="close-technique" aria-label="关闭实力调节">×</button></div>
 <p class="technique-intro">拖动滑杆即可调整，100% 为基准。</p>
 <div class="technique-columns"><section aria-label="我的实力"><header><div><h3>我的实力</h3><p>林楠</p></div><button id="reset-player-skills">恢复 100%</button></header><div class="player-stat-grid">${rows('player',{})}</div></section>
 <section aria-label="对手实力"><header><div><h3>对手实力</h3><p id="opponent-skill-preset">以当前等级为基础</p></div><button id="reset-opponent-skills">恢复 100%</button></header><div class="opponent-stat-grid">${rows('opponent',{})}</div></section></div>

 <button class="technique-done" id="done-technique">完成调整 →</button>`;
 document.body.append(dialog);
 const updateOutputs=()=>{for(const input of dialog.querySelectorAll('input'))input.nextElementSibling.value=`${input.value}%`;};
 const read=side=>normalizeSkills(Object.fromEntries(SKILL_KEYS.map(key=>[key,Number(dialog.querySelector(`#${side}-${key}`).value)/100])));
 const write=(side,values)=>{const t=normalizeSkills(values);for(const key of SKILL_KEYS)dialog.querySelector(`#${side}-${key}`).value=Math.round(t[key]*100);updateOutputs();};
 for(const side of ['player','opponent'])for(const input of dialog.querySelectorAll(`.${side}-stat-grid input`))input.addEventListener('input',()=>{updateOutputs();(side==='player'?onPlayerChange:onOpponentChange)(read(side));});
 dialog.querySelector('#reset-player-skills').onclick=()=>{onResetPlayer();updateOutputs();onOpen?.();};
 dialog.querySelector('#reset-opponent-skills').onclick=()=>{write('opponent',{});onResetOpponent();onOpen?.();};
 const close=()=>dialog.close();
 dialog.querySelector('#close-technique').onclick=close;dialog.querySelector('#done-technique').onclick=close;
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}});
 const open=()=>{onOpen?.();updateOutputs();dialog.showModal();};
 for(const button of document.querySelectorAll('[data-open-technique]'))button.addEventListener('click',open);
 return {open,read,write,dialog};
}
