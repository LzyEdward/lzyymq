const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const shortShots=new Set(['drop','slicedrop','net','netcross']);
const attacks=new Set(['smash','slicesmash','netkill']);
export const TACTICAL_LABELS=Object.freeze({pullDrop:'拉后吊前',netPush:'放网推后',change:'左右调动',body:'追身压制',backhand:'压反手',fatigue:'消耗体能'});

// Memory contains observed shuttle placements only, never pending controls.
// Repeating a corner shifts the base towards it; changing direction then
// exploits that commitment through ordinary acceleration and travel distance.
export class OpponentMemory {
 constructor(){this.reset();}
 reset(){this.shots=[];this.coverage={x:0,z:-3.9};this.confidence=0;this.pressure=null;}
 observe({type,target,position,velocity={x:0,z:0},quality=1,fault=null,energy=100,level}){
  const prev=this.shots.at(-1),gap=distance(position,target),q=clamp(quality,0,1);
  const direction={x:target.x-position.x,z:target.z-position.z},speed=Math.hypot(velocity.x,velocity.z);
  const opposing=speed>.5?clamp(-(direction.x*velocity.x+direction.z*velocity.z)/Math.max(.01,gap*speed),0,1):0;
  let key=null;
  if(prev&&prev.target.z<-4.6&&target.z>-2.2&&shortShots.has(type)&&position.z<-3.6)key='pullDrop';
  else if(prev&&prev.target.z>-2.3&&target.z<-4.7&&position.z>-3.3)key='netPush';
  else if(prev&&prev.target.x*target.x<-.8&&Math.abs(target.x-prev.target.x)>2.8&&gap>2.3)key='change';
  else if(['push','drive','smash','slicesmash'].includes(type)&&Math.abs(target.x-position.x)<.55&&gap<2.5)key='body';
  else if(target.x< -1.35&&target.z<-3.6&&gap>1.4)key='backhand';
  else if(energy<38&&gap>2.5)key='fatigue';
  const displacement=clamp((gap-1.2)/4.2,0,1);
  const strength=fault?0:q*clamp(displacement*.55+opposing*.22+(key?.22:0),0,1);
  this.pressure={key,strength,gap,opposing,type,quality:q,target:{...target},fault};
  if(!fault&&q>.55&&type!=='serve'){
   this.shots.push({type,target:{...target}});this.shots=this.shots.slice(-8);
   const recent=this.shots.slice(-3),same=recent.length>=2&&recent.every(s=>distance(s.target,target)<1.55);
   this.confidence=same?clamp(this.confidence+.22,0,.85):this.confidence*.45;
   this.coverage.x=clamp(target.x*.34*this.confidence,-.68,.68);
   this.coverage.z=clamp(-3.9+(target.z+3.9)*.30*this.confidence,-4.55,-3.25);
  }
  const susceptibility=1-(level?.anticipation??.4)*.68;
  return {...this.pressure,delay:strength*susceptibility*.18,speedFactor:1-strength*susceptibility*.11,qualityPenalty:strength*susceptibility*.24};
 }
 base(base,level){
  const amount=.45+(level?.anticipation??.4)*.55;
  return {x:clamp(base.x+this.coverage.x*amount,-1.05,1.05),z:clamp(base.z+(this.coverage.z+3.9)*amount,-4.85,-2.45)};
 }
}

export function movementEnergyRate({speed=0,sprinting=false,staminaSkill=1,resting=false}={}){
 const skill=clamp(staminaSkill,.4,1.6);
 if(resting)return 12*(.75+skill*.25);
 const effort=Math.max(0,speed-1.2);
 return (effort<.3?6.5:1.7-effort*.95-(sprinting?7:0))*(1.2-.2*skill);
}

// Initial displacement creates a race. A defender who wins that race earns
// their normal technique back; do not keep penalising an early, settled catch.
export function contactPressure({initial=0,distance=0,reach=1,height=2,speed=0,energy=100}={}){
 const stretch=clamp((distance/Math.max(.1,reach)-.35)/.65,0,1);
 const low=clamp((1.5-height)/1.2,0,1),rushing=clamp((speed-2.5)/5,0,1);
 const fatigue=clamp((38-energy)/38,0,1);
 return clamp(initial*(.08+stretch*.48+low*.55+rushing*.40+fatigue*.22),0,1);
}

export function directionalTarget({position,kind,mode='natural',natural,opponent}){
 if(mode==='open')return {x:opponent.x>.25?-2.08:opponent.x<-.25?2.08:position.x>.1?-2.08:2.08,z:natural.z};
 const lane=Math.abs(position.x)>.42?Math.sign(position.x):1;
 if(mode==='straight')return {x:lane*1.96,z:natural.z};
 if(mode==='cross')return {x:-lane*2.08,z:natural.z};
 return {...natural};
}

export const MATCH_OBJECTIVES=Object.freeze([
 {key:'nonSmash',name:'巧打得分',description:'不使用杀球或扑杀，靠落点和调动赢下 3 分',goal:3},
 {key:'combination',name:'调动大师',description:'拉后吊前、放网推后或左右调动赢下 2 分',goal:2},
 {key:'variety',name:'球路万花筒',description:'一场里用 4 种不同球路得分',goal:4},
]);

export class MatchTactics {
 constructor(){this.reset();}
 reset(){this.points=[];this.methods={};this.counts={nonSmash:0,combination:0,variety:0};this.rally=[];this.lastResult=null;}
 newRally(){this.rally=[];}
 stroke(event){
  this.rally.push({...event,target:event.target?{...event.target}:null});
  if(this.rally.length>40)this.rally.shift();
 }
 finish({playerWon,lastHitter,reason='落地',opponentEnergy=100}){
  const mine=this.rally.filter(s=>s.hitter==='player'),last=mine.at(-1);
  const pressure=last?.pressure,valid=last&&!last.fault&&last.type!=='serve';
  const reply=this.rally.at(-1);
  const forced=valid&&lastHitter==='opponent'&&(reply?.pressureStrength??pressure?.strength??0)>.30;
  let method='opponentError',label='对手失误',detail=reason;
  if(playerWon&&valid&&(lastHitter==='player'||forced)){
   method=last.type;
   label=forced?'逼迫失误':shortShots.has(last.type)?'网前制胜':attacks.has(last.type)?'进攻制胜':'落点制胜';
   detail=pressure?.key&&pressure.strength>.28?TACTICAL_LABELS[pressure.key]:opponentEnergy<30?'持续调动耗尽对手体能':forced?'压出被动回球':shortShots.has(last.type)?'球贴网下坠，对手未能到位':'击中防守空当';
   this.methods[method]=(this.methods[method]||0)+1;
   if(!attacks.has(last.type))this.counts.nonSmash++;
   if(['pullDrop','netPush','change'].includes(pressure?.key)&&pressure.strength>.28)this.counts.combination++;
   this.counts.variety=Object.keys(this.methods).length;
  }else if(!playerWon){method='lost';label=last?.fault&&lastHitter==='player'?'我方击球失误':'对手得分';}
  const before=this.points.length?this.points.at(-1).completed:[];
  const completed=MATCH_OBJECTIVES.filter(o=>this.counts[o.key]>=o.goal).map(o=>o.key);
  const unlocked=completed.filter(key=>!before.includes(key));
  const result={playerWon,method,label,detail,forced,completed,unlocked,shot:last?.type||null};
  this.points.push(result);this.lastResult=result;return result;
 }
}
