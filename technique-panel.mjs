import { normalizeSkills, SKILL_KEYS } from './player-styles.mjs?v=6.5.0';

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
 dialog.innerHTML=`<div class="technique-header"><div><span>BUILD YOUR MATCH</span><h2 id="technique-title">双方实力，自己定。</h2></div><button id="close-technique" aria-label="关闭实力调节">×</button></div>
 <p class="technique-intro">我的 100% 是标准球员；球星模式会给出不同参数。对手 100% 是所选等级与球星的基础实力。每项独立调整，即时生效。</p>
 <div class="technique-columns"><section aria-label="我的实力"><header><div><h3>我的实力</h3><p id="player-skill-preset">林丹模式</p></div><button id="reset-player-skills">重置球星参数</button></header><div class="player-stat-grid">${rows('player',{attack:1.32,defense:1.03,control:1.04,net:1.08,speed:1.12,stamina:1.12})}</div></section>
 <section aria-label="对手实力"><header><div><h3>对手实力</h3><p id="opponent-skill-preset">以当前等级为基础</p></div><button id="reset-opponent-skills">重置六项为 100%</button></header><div class="opponent-stat-grid">${rows('opponent',{})}</div></section></div>
 <p class="technique-summary" id="opponent-skill-summary"></p><p class="technique-note">进攻不会让低点击球变成重杀；网前与控球影响贴网和精准度。调低防守、步法后，对手更容易被吊球和对角调动。</p>
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
