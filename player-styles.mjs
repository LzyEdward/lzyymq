// Play-style presets are game abstractions of publicly documented match
// traits. They do not claim to reproduce a real athlete or their appearance.
export const PLAYER_STYLES=Object.freeze({
 custom:Object.freeze({name:'自定义球员',attack:100,speed:100,defense:100,net:100,control:100,stamina:100,tactic:'balanced'}),
 linDan08:Object.freeze({name:'2008 林丹风格',attack:132,speed:112,defense:103,net:108,control:104,stamina:112,tactic:'power'}),
 leeChongWei:Object.freeze({name:'李宗伟风格',attack:112,speed:128,defense:118,net:108,control:124,stamina:118,tactic:'angle'}),
 chenLong:Object.freeze({name:'谌龙风格',attack:103,speed:111,defense:130,net:112,control:124,stamina:126,tactic:'rally'}),
 taufik:Object.freeze({name:'陶菲克风格',attack:111,speed:105,defense:105,net:130,control:126,stamina:105,tactic:'touch'}),
});

export const OPPONENT_STYLES=Object.freeze({
 allround:Object.freeze({name:'综合型对手',speed:1,reaction:1,reach:1,accuracy:1,attack:1,power:1,netSkill:1,anticipation:1,tactic:'balanced'}),
 linDan08:Object.freeze({name:'2008 林丹风格',speed:1.04,reaction:.94,reach:1,accuracy:1.04,attack:1.2,power:1.15,netSkill:1.04,anticipation:1.04,tactic:'power'}),
 leeChongWei:Object.freeze({name:'李宗伟风格',speed:1.16,reaction:.86,reach:1.04,accuracy:1.1,attack:1.08,power:1.07,netSkill:1.08,anticipation:1.14,tactic:'angle'}),
 chenLong:Object.freeze({name:'谌龙风格',speed:1.08,reaction:.95,reach:1.1,accuracy:1.16,attack:.96,power:1.03,netSkill:1.08,anticipation:1.16,tactic:'rally'}),
 taufik:Object.freeze({name:'陶菲克风格',speed:1,reaction:.98,reach:1,accuracy:1.12,attack:1.02,power:1.02,netSkill:1.22,anticipation:1.08,tactic:'touch'}),
});

export const SKILL_KEYS=Object.freeze(['attack','defense','control','net','speed','stamina']);
const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
export function normalizeSkills(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 return Object.fromEntries(SKILL_KEYS.map(key=>[key,bound(Number.isFinite(Number(raw[key]))?Number(raw[key]):1,.4,1.6)]));
}

export function effectiveOpponentLevel(base,styleKey='allround',tuning={}){
 const style=OPPONENT_STYLES[styleKey]||OPPONENT_STYLES.allround;
 const t=normalizeSkills(tuning);
 return {...base,name:styleKey==='allround'?base.name:style.name,
  speed:bound(base.speed*style.speed*t.speed,1.3,11),
  acceleration:base.acceleration*(.55+.45*t.speed),
  reaction:bound(base.reaction*style.reaction/t.defense,.045,1.2),
  reach:bound(base.reach*style.reach*(.65+.35*t.defense),.55,2.35),
  accuracy:bound(base.accuracy*style.accuracy+(t.control-1)*.55,.08,.995),
  attack:bound(base.attack*style.attack+(t.attack-1)*.60,.015,.995),
  power:bound(base.power*style.power*(.35+.65*t.attack),16,110),
  netSkill:bound(base.netSkill*style.netSkill+(t.net-1)*.65,.015,.995),
  anticipation:bound(base.anticipation*style.anticipation+(t.defense-1)*.45,.015,.995),
  stamina:t.stamina};
}

export function playerStatsFromInputs(root=document){
 const read=id=>Math.max(.4,Math.min(1.6,(Number(root.querySelector(`#player-${id}`)?.value)||100)/100));
 return {attack:read('attack'),speed:read('speed'),defense:read('defense'),net:read('net'),control:read('control'),stamina:read('stamina')};
}
export function playerStatsForStyle(key='custom'){
 const p=PLAYER_STYLES[key]||PLAYER_STYLES.custom;
 return {attack:p.attack/100,speed:p.speed/100,defense:p.defense/100,net:p.net/100,control:p.control/100,stamina:p.stamina/100};
}
