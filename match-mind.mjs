const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const OPPONENT_CHARACTERS=Object.freeze({
 balanced:{name:'全场均衡',description:'轮换前后场与两侧，寻找空当',weights:{},base:0},
 attack:{name:'连续强攻',description:'高点下压，追身后衔接网前；被拉开后有回位空当',weights:{smash:2.0,slicesmash:1.8,drive:1.5,push:1.3,clear:.72},base:.15},
 netpress:{name:'抢网压迫',description:'主动放网、勾角后跟进，提防被推向身后',weights:{net:2.5,netcross:2.0,push:1.6,netkill:1.6,clear:.6,lift:.75,drop:1.4},base:.38},
 defend:{name:'耐心拉吊',description:'先拉开再变速，优先保证回球；强行进攻较少',weights:{clear:1.8,lift:1.4,drop:1.5,slicedrop:1.4,smash:.58,slicesmash:.55},base:-.12},
 counter:{name:'防守反击',description:'被动先过渡，等短球或空当再加速',weights:{clear:1.35,lift:1.45,net:1.2,smash:.75,drive:1.15},base:-.2},
});
export function resolveCharacter(profile='auto',style='allround'){
 return OPPONENT_CHARACTERS[profile]?profile:({linDan08:'attack',leeChongWei:'counter',chenLong:'defend',taufik:'netpress'})[style]||'balanced';
}
// Score only changes decision-making. Speed, accuracy and reach stay tied to
// the selected grade and sliders; there is no hidden catch-up power boost.
export function matchIntent({profile='balanced',style='allround',score=[0,0],points=11,energy=100,recent=[]}={}){
 const character=resolveCharacter(profile,style),p=OPPONENT_CHARACTERS[character];
 const deficit=score[0]-score[1],closing=Math.max(...score)>=points-2;
 const losses=recent.slice(-3).filter(x=>x.playerWon).length;
 const phase=energy<32?'manage':closing&&Math.abs(deficit)<=2?'clutch':deficit>=3||losses===3?'chase':deficit<=-3?'protect':'build';
 const label={manage:'节省体能，拉开过渡',clutch:'关键分，先稳住再找机会',chase:'调整节奏，主动寻找变化',protect:'领先控制，减少强攻失误',build:'按打法组织下一拍'}[phase];
 return {character,name:p.name,phase,label,base:p.base,weights:p.weights};
}
export function characterWeight(candidate,{intent,pressure=0,position,player,last,level}){
 const type=candidate.type,attacks=['smash','slicesmash','netkill'].includes(type),safe=['clear','lift'].includes(type);
 let weight=intent.weights[type]??1;
 if(intent.character==='counter'){
  const opening=position.y>2.4&&position.z>-4.5&&Math.abs(candidate.target.x-player.x)>2.2;
  weight*=attacks?(opening&&pressure<.2?3.5:.55):safe&&pressure>.25?1.7:1;
 }
 if(intent.phase==='manage')weight*=attacks?.28:safe?1.6:1.1;
 if(['protect','clutch'].includes(intent.phase))weight*=attacks?.72:safe?1.25:1.08;
 if(intent.phase==='chase')weight*=candidate.target.z<2.3?1.45:Math.abs(candidate.target.x-position.x)>2.1?1.3:1;
 // Link a soft forecourt shot to a push behind a player who followed it in.
 if(last?.target?.z<2.3&&player.z<3.4&&candidate.target.z>4.7)weight*=1.2+level.anticipation*.5;
 return clamp(weight,.12,5);
}
export function characterRecovery(base,intent){
 const adjustment=intent.phase==='manage'?-.12:intent.phase==='chase'?.1:0;
 return {...base,z:clamp(base.z+intent.base+adjustment,-4.45,-2.45)};
}

export function strokeSoundProfile(type){
 if(['smash','slicesmash','netkill'].includes(type))return {brightness:1.05,volume:1,tail:1};
 if(['net','netcross'].includes(type))return {brightness:.68,volume:.38,tail:.46};
 if(['drop','slicedrop'].includes(type))return {brightness:.83,volume:.54,tail:.65};
 return {brightness:.95,volume:.82,tail:.9};
}
