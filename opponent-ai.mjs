const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Weaknesses are deliberately expressed as readable tactical lanes.  They
// are stable for a match, but the caller can reduce them after the opponent
// has seen the same pattern repeatedly.  This gives the player something to
// discover and exploit instead of a hidden random miss roll.
const STYLE_WEAKNESS = Object.freeze({
 allround:{backhand:1.12,rear:.94,net:1.08,body:.90,recovery:1.02},
 linDan08:{backhand:.82,rear:.72,net:.94,body:.88,recovery:.78},
 leeChongWei:{backhand:.88,rear:.90,net:.72,body:.86,recovery:.68},
 chenLong:{backhand:.90,rear:.82,net:.78,body:.84,recovery:.72},
 taufik:{backhand:.86,rear:.95,net:.62,body:.92,recovery:.88},
});

export function opponentWeaknessProfile({level,style='allround',profile='balanced'}={}){
 const tier=clamp(Number(level?.tier)||1,1,10);
 const base=clamp(.52-(tier-1)*.038,.16,.52), factor=STYLE_WEAKNESS[style]||STYLE_WEAKNESS.allround;
 const technique={backhand:1-(level?.accuracy??.7)*.26,rear:1-(level?.anticipation??.4)*.22,net:1-(level?.netSkill??.4)*.28,body:1-(level?.anticipation??.4)*.25,recovery:1-(level?.anticipation??.4)*.30};
 const styleRisk=profile==='attack'?{net:1.16,recovery:1.16,rear:.9}:profile==='defend'?{net:.86,rear:1.14,body:1.12}:{};
 return Object.fromEntries(Object.entries(factor).map(([key,mult])=>[key,clamp(base*mult*technique[key]*(styleRisk[key]||1),.045,.58)]));
}

export function opponentWeaknessKey({position={x:0,y:1.5,z:-3},shot='clear'}={}){
 if (position.z>-2.35 || ['net','netcross','netkill','drop','slicedrop'].includes(shot)) return 'net';
 if (position.z<-5.05) return 'rear';
 if (Math.abs(position.x)<.52 || ['drive','push'].includes(shot)) return 'body';
 return position.x<0?'backhand':'recovery';
}

export function opponentReceiveBase({serverX=.45,high=false}={}){
 return {x:-Math.sign(serverX||1)*.75,z:high?-4.4:-2.4};
}
export function opponentContactWindow({ball,position,level,training=false}){
 const distance=Math.hypot(ball.x-position.x,ball.z-position.z),reach=training?1.25:level.reach;
 const lowReach=ball.y<1.5?reach*(.61+level.netSkill*.17):reach;
 return distance<lowReach&&ball.z-position.z>-.18&&ball.z<-.55&&ball.y>(.3)&&ball.y<(training?2.55:level.rating>=1350?3.05:2.6);
}

// Readable singles short serve: mostly central, with only modest lane
// variation so a receiver can set their feet and choose a return.
export function opponentServeTarget({level,random=Math.random}={}){
 const tier=clamp(Math.round(level?.tier||1),1,10),progress=(tier-1)/9;
 const r=()=>clamp(random(),0,.999999);
 const side=r()<.5?-1:1;
 const x=r()<.78 ? (r()-.5)*(.62+progress*.20) : side*(.28+r()*(.20+progress*.12));
 const z=3.55-progress*.08+(r()-.5)*.24;
 return {x:clamp(x,-.62,.62),z:clamp(z,3.32,3.72)};
}

// Opportunity is sampled once per incoming rally by the caller, so a miss is
// an actual skill outcome rather than a per-frame lottery that always resolves.
export function opponentReceiveMissChance({level,shot='clear',position,distance,reach,energy=100,weaknesses=null,weaknessKey=null,adaptation=0}){
 const ratio=distance/Math.max(.1,reach);
 const stretch=clamp((ratio-.58)/.48,0,1);
 const netShot=['drop','slicedrop','net','netcross'].includes(shot)&&position.z>-3.8;
 const low=clamp((1.15-position.y)/.95,0,1);
 const fatigue=1-clamp(energy/100,0,1);
 // Beginners should visibly struggle with tight net play. Scale the base
 // error by their technical level, then add a meaningful penalty for a
 // short, low ball; elite players still occasionally misjudge a brush shot.
 let chance=.018+(1-level.accuracy)*.23;
 chance+=stretch*(.04+.12*(1-level.anticipation));
 if(netShot)chance+=(.035+.29*(1-level.netSkill))*(.72+low*.45);
 chance+=fatigue*.075;
 const lane=weaknessKey||opponentWeaknessKey({position,shot});
 const weakness=Number(weaknesses?.[lane])||0;
 // A discovered weakness matters, while repeated identical attacks let the
 // opponent partially close it.  Adaptation is supplied per lane by game.js.
 chance+=weakness*(.08+.18*clamp(stretch+.35*low,0,1))*(1-clamp(adaptation,0,.82));
 return clamp(chance,0,.72);
}

// Low grades can mishit under pressure and fall short on clears more often.
export function opponentStrokeExecution({level,type,target,quality=1,energy=100,pressure=0,random=Math.random}){
 const fatigue=1-clamp(energy/100,0,1);
 const netShot=['drop','slicedrop','net','netcross','lift'].includes(type);
 const faultChance=clamp((1-level.accuracy)*.17+(1-quality)*.08+fatigue*.07+(netShot?(1-level.netSkill)*.045:0),0,.24);
 if(random()<faultChance){
  const fault=random()<.55?'net':'out';
  return {target:{...target,x:fault==='out'?Math.sign(target.x||1)*3.35:target.x},fault};
 }
 const imprecision=1-level.accuracy;
 const xError=(random()*2-1)*imprecision*1.35;
 const zError=(random()*2-1)*imprecision*1.25;
 const shortfall=['clear','lift'].includes(type)?imprecision*3.4+clamp(pressure,0,1)*(1-level.accuracy*.6)*1.5:0;
 return {target:{x:target.x+xError,z:target.z+zError-shortfall},fault:null};
}

// All choices use observed court positions, never the player's pending input.
export function planOpponentStroke({level,position,player,playerVelocity={x:0,z:0},energy=100,profile='balanced',tactic='balanced',history=[],pressure=0,random=Math.random}){
 const net=position.z>-2.6,low=position.y<.83,skill=level.netSkill,tier=level.tier;
 const anticipatedX=clamp(player.x+playerVelocity.x*(.12+level.anticipation*.24),-2.4,2.4);
 const anticipatedZ=clamp(player.z+playerVelocity.z*(.12+level.anticipation*.24),1.2,6.15);
 const openX=anticipatedX>.2?-2.03:anticipatedX<-.2?2.03:(random()<.5?-1:1)*1.9;
 const straight=clamp(position.x*.9,-2.12,2.12),cross=position.x>.1?-1.98:position.x<-.1?1.98:openX;
 // Lead the player's run instead of aiming at a stale snapshot. This creates
 // useful pressure on a player who is sprinting across the court.
 const bodyX=clamp(anticipatedX*.62+playerVelocity.x*.2,-1.35,1.35);
 const candidates=[];
 const add=(type,x,z,weight,action)=>candidates.push({type,target:{x,z},weight,action});
 if(net){
  add('lift',openX,5.9,low?14:1.7,'挑后场');
  if(!low){
   add('net',straight,1.05+(1-skill)*.65,1.25+skill*2.1,'正手放网');
   if(tier>=3){add('netcross',cross,.85+(1-skill)*.5,1.1+skill*3.5,'勾对角');add('net',straight,.68+(1-skill)*.7,.85+skill*3.0,'搓网');}
   if(position.y>1.2){add('push',openX,5.05,1.0+skill*1.6,'推后场');add('push',bodyX,4.65,.35+skill*1.25,'推追身');}
   if(position.y>1.95&&tier>=3){add('netkill',openX,2.0,1.7+level.attack*5,'扑球');if(tier>=6)add('netkill',cross,1.2,.35+skill*2.2,'反手封网');}
  }
 }else{
  add('clear',openX,5.8,3.0-level.attack*.72,'高远拉开');
  add('clear',straight,6.0,1.05,'直线高远');
  add('clear',cross,5.35,.3+skill*.55,'斜线高远');
  add('drop',straight,1.1+(1-skill)*.7,.9+skill*1.65,'直线吊球');
  if(tier>=3){add('slicedrop',cross,1.10,.65+skill*1.55,'劈吊对角');if(tier>=6)add('slicedrop',openX,1.4,.3+skill,'滑板吊斜线');}
  if(position.y>2.4&&tier>=4)add('slicesmash',cross,3.35,.45+level.attack*2.5,'劈杀斜线');
  if(position.y>2.25){add('smash',openX,anticipatedZ>4.8?3.0:4.8,.4+level.attack*4.5,'杀空当');add('smash',bodyX,anticipatedZ>4.8?3.35:4.8,.3+level.attack*2.2,'追身点杀');}
  if(position.y>1&&position.y<2.65){add('drive',openX,4.5,.6+level.attack*1.8,'平抽压制');if(tier>=4)add('drive',bodyX,3.35,.4+skill*1.4,'突击追身');}
 }
 const last=history.at(-1),same=history.slice(-2);
 for(const candidate of candidates){
  const distance=Math.hypot(candidate.target.x-anticipatedX,candidate.target.z-anticipatedZ);
  candidate.weight*=.8+distance*.17*level.anticipation;
  if(anticipatedZ>4.9&&candidate.target.z<2.2)candidate.weight*=1+skill*1.1;
  if(player.z<2.5&&candidate.target.z>4.7)candidate.weight*=1+level.anticipation*1.4;
  // Do not merely change the shot name: remember recent landing lanes too.
  // A same-lane repeat is still possible when it is the only sensible reply
  // (for example, a low defensive net contact), but otherwise gets downweighted.
  const repeatedLane=history.slice(-2).some(previous=>previous.target&&Math.hypot(previous.target.x-candidate.target.x,previous.target.z-candidate.target.z)<1.15);
  if(candidate.action===last?.action)candidate.weight*=.42;
  if(repeatedLane)candidate.weight*=.56;
  if(same.length===2&&same.every(p=>p.type===candidate.type)&&candidates.some(p=>p.type!==candidate.type))candidate.weight*=.12;
  if(profile==='attack'&&['smash','slicesmash','netkill','push','drive'].includes(candidate.type))candidate.weight*=1.55;
  if(profile==='defend'&&['clear','lift','net','netcross','drop','slicedrop'].includes(candidate.type))candidate.weight*=1.5;
  if(profile==='balanced'&&['drop','net','push','drive'].includes(candidate.type))candidate.weight*=1.08;
  if(tactic==='power'&&['smash','netkill','drive'].includes(candidate.type))candidate.weight*=1.62;
  if(tactic==='angle'&&['slicesmash','slicedrop','netcross','drop','net'].includes(candidate.type)&&Math.abs(candidate.target.x-position.x)>1.1)candidate.weight*=1.8;
  if(tactic==='rally'&&['clear','drive'].includes(candidate.type))candidate.weight*=1.28;
  if(tactic==='touch'&&['net','drop','push'].includes(candidate.type))candidate.weight*=1.58;
  if(energy<28&&['smash','slicesmash'].includes(candidate.type))candidate.weight*=.25;
  // Build a point over successive strokes: clear to the back then change
  // pace, or show the net then push behind a player who has committed.
  if(last?.target?.z>4.8&&anticipatedZ>3.9&&candidate.target.z<2.2)candidate.weight*=1.35+level.anticipation*.8;
  if(last?.target?.z<2.3&&anticipatedZ<3.6&&candidate.target.z>4.8)candidate.weight*=1.35+level.anticipation*.8;
  if(pressure>.38){
   if(['smash','slicesmash','netkill'].includes(candidate.type))candidate.weight*=.12;
   if(['lift','clear'].includes(candidate.type))candidate.weight*=1+pressure*3.2;
   if(['net','netcross'].includes(candidate.type)&&position.y<1.1)candidate.weight*=.4;
  }
 }
 const total=candidates.reduce((sum,c)=>sum+c.weight,0);let pick=clamp(random(),0,.999999)*total;
 let selected=candidates.at(-1);for(const c of candidates){pick-=c.weight;if(pick<=0){selected=c;break;}}
 const action=pressure>.38&&['lift','clear'].includes(selected.type)?`被动${selected.type==='lift'?'挑球':'过渡高球'}`:selected.action;
 return {...selected,action,target:{...selected.target},backhand:position.x<-.25,spin:selected.action==='搓网'?skill:0};
}

export function recoveryBase({lastContact,lastTarget,level}){
 const netShot=lastTarget&&lastTarget.z<2.3,fromNet=lastContact&&lastContact.z>-2.7;
 return {x:clamp((lastTarget?.x||0)*.17*level.anticipation,-.65,.65),z:netShot&&fromNet?-3.2+level.anticipation*.65:netShot?-3.65:-3.9-level.attack*.15};
}

export function opponentFootwork({position,velocity,target,level,energy=100,waiting=false},dt){
 const dx=target.x-position.x,dz=target.z-position.z,distance=Math.hypot(dx,dz);
 // A visible split-step anticipation replaces the old statue-like reaction
 // pause. Level still controls how soon the opponent commits and how fast.
 const acceleration=level.acceleration*(waiting?.35:1.12),top=waiting?Math.min(.8,level.speed*.16):level.speed*1.18*(.68+.32*clamp(energy/100,0,1));
 const desired=Math.min(top,Math.sqrt(Math.max(0,distance-.035)*acceleration*1.65));
 const wanted={x:distance>.035?dx/distance*desired:0,z:distance>.035?dz/distance*desired:0};
 const dvx=wanted.x-velocity.x,dvz=wanted.z-velocity.z,delta=Math.hypot(dvx,dvz),factor=delta?Math.min(1,acceleration*dt/delta):0;
 const next={x:velocity.x+dvx*factor,z:velocity.z+dvz*factor};
 const mode=waiting?'split':Math.abs(dx)>.65&&dz<-.55?'crossover':target.z>-2.4&&dz>.18?'net-approach':Math.abs(dx)>.4?'chasse':distance<.3?'ready':'recover';
 return {velocity:next,position:{x:clamp(position.x+next.x*dt,-3.2,3.2),z:clamp(position.z+next.z*dt,-7.1,-.65)},mode};
}
