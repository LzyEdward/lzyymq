const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export const OPPONENT_LEVELS=Object.freeze({
 easy: Object.freeze({name:'中羽参考 1 级',tier:1,rating:750,speed:2.65,reaction:.56,reach:.88,accuracy:.32,attack:.06,power:30,netSkill:.04,anticipation:.05,acceleration:8}),
 normal:Object.freeze({name:'中羽参考 2 级',tier:2,rating:1050,speed:3.35,reaction:.44,reach:1.02,accuracy:.47,attack:.17,power:37,netSkill:.12,anticipation:.13,acceleration:10}),
 hard:Object.freeze({name:'中羽参考 3 级',tier:3,rating:1350,speed:4.1,reaction:.34,reach:1.16,accuracy:.61,attack:.31,power:45,netSkill:.25,anticipation:.25,acceleration:12.5}),
 expert:Object.freeze({name:'中羽参考 4 级',tier:4,rating:1650,speed:4.85,reaction:.27,reach:1.3,accuracy:.73,attack:.47,power:54,netSkill:.41,anticipation:.39,acceleration:15}),
 master:Object.freeze({name:'中羽参考 5 级',tier:5,rating:1900,speed:5.55,reaction:.21,reach:1.43,accuracy:.82,attack:.61,power:63,netSkill:.57,anticipation:.53,acceleration:17.5}),
 elite:Object.freeze({name:'中羽参考 6 级',tier:6,rating:2150,speed:6.15,reaction:.165,reach:1.55,accuracy:.88,attack:.72,power:71,netSkill:.69,anticipation:.66,acceleration:20}),
 advanced:Object.freeze({name:'中羽参考 7 级',tier:7,rating:2350,speed:6.65,reaction:.13,reach:1.67,accuracy:.925,attack:.81,power:79,netSkill:.80,anticipation:.77,acceleration:22.5}),
 pro:Object.freeze({name:'中羽参考 8 级',tier:8,rating:2550,speed:7.05,reaction:.105,reach:1.78,accuracy:.952,attack:.88,power:86,netSkill:.89,anticipation:.87,acceleration:25}),
 national:Object.freeze({name:'中羽参考 9 级',tier:9,rating:2750,speed:7.45,reaction:.085,reach:1.89,accuracy:.972,attack:.94,power:93,netSkill:.95,anticipation:.94,acceleration:28}),
 legend:Object.freeze({name:'中羽参考 10 级',tier:10,rating:2950,speed:7.8,reaction:.065,reach:2,accuracy:.99,attack:.98,power:100,netSkill:.99,anticipation:.99,acceleration:31}),
});
export const LEVEL_DESCRIPTIONS=Object.freeze(['','初学运动概念；步法和回球不稳定','基础正反手；放网质量有限','六点步法初成；初步搓球、勾对角','基本技术较全面；落点和稳定性提高','主动组织拉吊；衔接进攻、网前变化','系统训练型；六点覆盖和连续压制','高水平竞技型；预判与网前抢点','专业风格；快速衔接、细腻小球','高水平专业风格；高精度连续攻防','顶尖竞技风格；完整战术与极快衔接']);
// Concise paraphrases of the linked 2021 community addendum, not official titles.
export const LEVEL_REFERENCES=Object.freeze(['','理解比赛规则，开始主动寻找对方空当','掌握部分基础动作，正反手转换和网前稳定性不足','基本完成六点步法，初步使用搓球和勾对角','基本技术熟练，非被动时能稳定回球到位','较强业余球员、非特招校队主力风格','系统训练、地区业余赛事高水平风格','竞技训练背景、强校队和省队非主力风格','普通职业、国青或高水平省队主力风格','优秀职业、国家队及高水平省队主力风格','顶尖职业和国际大赛主力风格']);
export function opponentLevel(key){return OPPONENT_LEVELS[key]||OPPONENT_LEVELS.normal;}
// Landing dispersion in metres; tired or stretched players lose precision.
export function placementSpread(key,quality=1,energy=100){
 const accuracy=opponentLevel(key).accuracy;
 return (.035+(1-accuracy)*.95)*(1+(1-clamp(energy/100,0,1))*.85)+(1-clamp(quality,0,1))*.35;
}
export function matchFinished(score,points=11){
 const goal=points===21?21:11,cap=goal===21?30:15;
 return Math.max(...score)>=cap||(Math.max(...score)>=goal&&Math.abs(score[0]-score[1])>=2);
}
export function rankName(rating){
 return rating<900?'青铜':rating<1100?'白银':rating<1300?'黄金':rating<1500?'铂金':rating<1700?'钻石':rating<1900?'大师':'传奇';
}
export function freshCareer(){return {rating:1000,played:0,wins:0,streak:0,bestStreak:0,history:[]};}
export function parseCareer(raw){
 try{
  const p=typeof raw==='string'?JSON.parse(raw):raw;
  if(!p||!Number.isFinite(p.rating))return freshCareer();
  const integer=(v,max=1000000)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):0;
  const played=integer(p.played),wins=Math.min(played,integer(p.wins));
  return {rating:clamp(Math.round(p.rating),100,3000),played,wins,streak:Math.min(wins,integer(p.streak)),bestStreak:Math.min(wins,integer(p.bestStreak)),history:Array.isArray(p.history)?p.history.filter(h=>typeof h.id==='string'&&Array.isArray(h.score)&&h.score.length===2&&h.score.every(n=>Number.isInteger(n)&&n>=0&&n<=30)&&Number.isFinite(h.delta)&&Number.isFinite(h.rating)&&OPPONENT_LEVELS[h.level]).slice(0,8):[]};
 }catch{return freshCareer();}
}
// Local-only Elo. Completed IDs make remounting a result idempotent.
export function settleMatch(career,{id,level='normal',score,points=11,mode='match',date=''}){
 if(mode!=='match'||!id||!matchFinished(score,points)||career.history.some(h=>h.id===id))return {career,delta:0,applied:false};
 const won=score[0]>score[1],expected=1/(1+10**((opponentLevel(level).rating-career.rating)/400));
 const delta=Math.round(32*(Number(won)-expected)),rating=clamp(career.rating+delta,100,3000),streak=won?career.streak+1:0;
 const history=[{id,level,score:[...score],delta:rating-career.rating,rating,date},...career.history].slice(0,8);
 return {career:{rating,played:career.played+1,wins:career.wins+Number(won),streak,bestStreak:Math.max(streak,career.bestStreak),history},delta:rating-career.rating,applied:true};
}
