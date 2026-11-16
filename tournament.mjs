const freeze = value => Object.freeze(value);

// The names below are selectable game rivals spanning the modern 1996–2026
// badminton era.  The ratings are gameplay tiers, while the style fields map
// to the existing physics and opponent decision system.
export const TOUR_STARS = freeze({
  linDan: freeze({id:'linDan',name:'林丹',latin:'Lin Dan',country:'中国',era:'2004–2020',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'legend',seed:1,signature:'高点重杀与连续突击'}),
  leeChongWei: freeze({id:'leeChongWei',name:'李宗伟',latin:'Lee Chong Wei',country:'马来西亚',era:'2002–2019',profile:'counter',style:'leeChongWei',kit:'leeChongWei',difficulty:'national',seed:2,signature:'速度、劈杀与反复变线'}),
  peterGade: freeze({id:'peterGade',name:'彼得·盖德',latin:'Peter Gade',country:'丹麦',era:'1994–2012',profile:'balanced',style:'allround',kit:'allround',difficulty:'advanced',seed:3,signature:'节奏变化与前场假动作'}),
  taufik: freeze({id:'taufik',name:'陶菲克',latin:'Taufik Hidayat',country:'印度尼西亚',era:'1998–2016',profile:'netpress',style:'taufik',kit:'taufik',difficulty:'advanced',seed:4,signature:'反手高球与网前手感'}),
  chenLong: freeze({id:'chenLong',name:'谌龙',latin:'Chen Long',country:'中国',era:'2008–2021',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'pro',seed:5,signature:'耐心防守与多拍控制'}),
  momota: freeze({id:'momota',name:'桃田贤斗',latin:'Kento Momota',country:'日本',era:'2013–2024',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'pro',seed:6,signature:'落点精确、压迫后场'}),
  shiYuqi: freeze({id:'shiYuqi',name:'石宇奇',latin:'Shi Yuqi',country:'中国',era:'2016–至今',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'pro',seed:7,signature:'左手突击与直线下压'}),
  viktorAxelsen: freeze({id:'viktorAxelsen',name:'安赛龙',latin:'Viktor Axelsen',country:'丹麦',era:'2011–至今',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'legend',seed:8,signature:'高点身高优势与重杀'}),
  ginting: freeze({id:'ginting',name:'金廷',latin:'Anthony Ginting',country:'印度尼西亚',era:'2015–至今',profile:'netpress',style:'taufik',kit:'taufik',difficulty:'national',seed:9,signature:'快速启动与扑网'}),
  chou: freeze({id:'chou',name:'周天成',latin:'Chou Tien-chen',country:'中国台北',era:'2012–至今',profile:'counter',style:'chenLong',kit:'chenLong',difficulty:'national',seed:10,signature:'顽强防守与反击'}),
  sonWanHo: freeze({id:'sonWanHo',name:'孙完虎',latin:'Son Wan-ho',country:'韩国',era:'2010–2020',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'advanced',seed:11,signature:'贴身防守与平抽'}),
  janO: freeze({id:'janO',name:'简·奥·约根森',latin:'Jan Ø. Jørgensen',country:'丹麦',era:'2004–2018',profile:'balanced',style:'allround',kit:'allround',difficulty:'advanced',seed:12,signature:'稳健高远与反手过渡'}),
  chenJin: freeze({id:'chenJin',name:'陈金',latin:'Chen Jin',country:'中国',era:'2002–2012',profile:'counter',style:'allround',kit:'allround',difficulty:'expert',seed:13,signature:'线路控制与防守反击'}),
  baoChunlai: freeze({id:'baoChunlai',name:'鲍春来',latin:'Bao Chunlai',country:'中国',era:'2001–2011',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'expert',seed:14,signature:'左手拉吊与耐心相持'}),
  hendra: freeze({id:'hendra',name:'亨德拉·塞蒂亚万',latin:'Hendra Setiawan',country:'印度尼西亚',era:'2001–至今',profile:'netpress',style:'taufik',kit:'taufik',difficulty:'expert',seed:15,signature:'网前封网与手腕变化'}),
  leeHyunIl: freeze({id:'leeHyunIl',name:'李炫一',latin:'Lee Hyun-il',country:'韩国',era:'1999–2018',profile:'counter',style:'chenLong',kit:'chenLong',difficulty:'expert',seed:16,signature:'反手线路与防守韧性'}),
  kunlavut: freeze({id:'kunlavut',name:'昆拉武特',latin:'Kunlavut Vitidsarn',country:'泰国',era:'2018–至今',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'pro',seed:17,signature:'网前细腻与多拍耐心'}),
  lakshya: freeze({id:'lakshya',name:'拉克什亚',latin:'Lakshya Sen',country:'印度',era:'2018–至今',profile:'attack',style:'leeChongWei',kit:'leeChongWei',difficulty:'advanced',seed:18,signature:'前场抢点与连续进攻'}),
  kodai: freeze({id:'kodai',name:'奈良冈功大',latin:'Kodai Naraoka',country:'日本',era:'2018–至今',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'pro',seed:19,signature:'极限防守与高质量拉吊'}),
  axelsenOld: freeze({id:'axelsenOld',name:'维克多·阿克塞尔森',latin:'Viktor Axelsen',country:'丹麦',era:'2016–至今',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'legend',seed:20,signature:'后场重压与高点控制'}),
  wongChoongHan: freeze({id:'wongChoongHan',name:'黄综翰',latin:'Wong Choong Hann',country:'马来西亚',era:'1998–2010',profile:'balanced',style:'allround',kit:'allround',difficulty:'expert',seed:21,signature:'全场均衡与线路耐心'}),
  ponsana: freeze({id:'ponsana',name:'波萨那',latin:'Boonsak Ponsana',country:'泰国',era:'2001–2016',profile:'netpress',style:'taufik',kit:'taufik',difficulty:'expert',seed:22,signature:'网前手感与突击'}),
  darenLiew: freeze({id:'darenLiew',name:'刘达伦',latin:'Liew Daren',country:'马来西亚',era:'2008–2020',profile:'counter',style:'leeChongWei',kit:'leeChongWei',difficulty:'advanced',seed:23,signature:'变线反击与快速平抽'}),
  anders: freeze({id:'anders',name:'安德斯·安东森',latin:'Anders Antonsen',country:'丹麦',era:'2015–至今',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'pro',seed:24,signature:'后场连续压制'}),
  leeZiiJia: freeze({id:'leeZiiJia',name:'李梓嘉',latin:'Lee Zii Jia',country:'马来西亚',era:'2016–至今',profile:'attack',style:'leeChongWei',kit:'leeChongWei',difficulty:'pro',seed:25,signature:'标志性全力重杀'}),
  jonatan: freeze({id:'jonatan',name:'乔纳坦·克里斯蒂',latin:'Jonatan Christie',country:'印度尼西亚',era:'2013–至今',profile:'counter',style:'leeChongWei',kit:'leeChongWei',difficulty:'pro',seed:26,signature:'快速突击和网前抢点'}),
  srikanth: freeze({id:'srikanth',name:'斯里坎特',latin:'Kidambi Srikanth',country:'印度',era:'2011–至今',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'advanced',seed:27,signature:'连贯进攻与直线突击'}),
  prannoy: freeze({id:'prannoy',name:'普兰诺伊',latin:'H. S. Prannoy',country:'印度',era:'2008–至今',profile:'counter',style:'chenLong',kit:'chenLong',difficulty:'advanced',seed:28,signature:'落后仍能咬住的防守反击'}),
  wangTzuWei: freeze({id:'wangTzuWei',name:'王子维',latin:'Wang Tzu-wei',country:'中国台北',era:'2012–至今',profile:'netpress',style:'taufik',kit:'taufik',difficulty:'advanced',seed:29,signature:'网前抢点与突然提速'}),
  tommy: freeze({id:'tommy',name:'汤米·苏吉亚托',latin:'Tommy Sugiarto',country:'印度尼西亚',era:'2006–2020',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'expert',seed:30,signature:'稳健后场和顽强防守'}),
  chenHong: freeze({id:'chenHong',name:'陈宏',latin:'Chen Hong',country:'中国',era:'1996–2007',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'expert',seed:31,signature:'快速抢攻和连续点杀'}),
  sunJun: freeze({id:'sunJun',name:'孙俊',latin:'Sun Jun',country:'中国',era:'1995–2001',profile:'counter',style:'allround',kit:'allround',difficulty:'expert',seed:32,signature:'左手突击与底线控制'}),
  padukone: freeze({id:'padukone',name:'普拉卡什·帕迪科内',latin:'Prakash Padukone',country:'印度',era:'1978–1991',profile:'balanced',style:'allround',kit:'allround',difficulty:'expert',seed:33,signature:'全场平衡与细腻控球'}),
  sony: freeze({id:'sony',name:'索尼·昆科罗',latin:'Sony Dwi Kuncoro',country:'印度尼西亚',era:'2000–2017',profile:'counter',style:'leeChongWei',kit:'leeChongWei',difficulty:'advanced',seed:34,signature:'快速反击与突然变线'}),
  peterRasmussen: freeze({id:'peterRasmussen',name:'彼得·拉斯姆森',latin:'Peter Rasmussen',country:'丹麦',era:'1990–2000',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'expert',seed:35,signature:'后场进攻与连续下压'}),
  parkSungHwan: freeze({id:'parkSungHwan',name:'朴成奂',latin:'Park Sung-hwan',country:'韩国',era:'2002–2013',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'advanced',seed:36,signature:'快速防守与平抽反击'}),
  huYun: freeze({id:'huYun',name:'胡赟',latin:'Hu Yun',country:'中国香港',era:'2003–2016',profile:'counter',style:'chenLong',kit:'chenLong',difficulty:'expert',seed:37,signature:'落点控制与耐心相持'}),
  ngKaLong: freeze({id:'ngKaLong',name:'伍家朗',latin:'Ng Ka Long Angus',country:'中国香港',era:'2012–至今',profile:'balanced',style:'allround',kit:'allround',difficulty:'advanced',seed:38,signature:'快速连贯与突击抢点'}),
  kantaphon: freeze({id:'kantaphon',name:'坎塔蓬',latin:'Kantaphon Wangcharoen',country:'泰国',era:'2014–至今',profile:'attack',style:'leeChongWei',kit:'leeChongWei',difficulty:'advanced',seed:39,signature:'提速突击与前场压迫'}),
  tsuneyama: freeze({id:'tsuneyama',name:'常山干太',latin:'Kanta Tsuneyama',country:'日本',era:'2014–至今',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'advanced',seed:40,signature:'多拍防守与线路耐心'}),
  tanongsak: freeze({id:'tanongsak',name:'塔农萨克',latin:'Tanongsak Saensomboonsuk',country:'泰国',era:'2007–2019',profile:'attack',style:'linDan08',kit:'linDan08',difficulty:'expert',seed:41,signature:'后场突击与主动抢攻'}),
  wongWingKi: freeze({id:'wongWingKi',name:'黄永棋',latin:'Wong Wing Ki',country:'中国香港',era:'2007–2020',profile:'counter',style:'leeChongWei',kit:'leeChongWei',difficulty:'expert',seed:42,signature:'高速防反与斜线变化'}),
  hsuJenHao: freeze({id:'hsuJenHao',name:'许仁豪',latin:'Hsu Jen-hao',country:'中国台北',era:'2009–2022',profile:'balanced',style:'allround',kit:'allround',difficulty:'expert',seed:43,signature:'全场覆盖与节奏调动'}),
  kashyap: freeze({id:'kashyap',name:'帕鲁帕利·卡夏普',latin:'Parupalli Kashyap',country:'印度',era:'2006–2020',profile:'attack',style:'leeChongWei',kit:'leeChongWei',difficulty:'expert',seed:44,signature:'前场压迫与快速突击'}),
  sanyam: freeze({id:'sanyam',name:'西蒙·桑托索',latin:'Simon Santoso',country:'印度尼西亚',era:'2000–2016',profile:'defend',style:'chenLong',kit:'chenLong',difficulty:'expert',seed:45,signature:'稳健防守与反击落点'}),
  saiPraneeth: freeze({id:'saiPraneeth',name:'赛·普拉尼斯',latin:'B. Sai Praneeth',country:'印度',era:'2009–2022',profile:'attack',style:'leeChongWei',kit:'leeChongWei',difficulty:'advanced',seed:46,signature:'快速抢攻与连续提速'}),
  leeDongKeun: freeze({id:'leeDongKeun',name:'李东根',latin:'Lee Dong-keun',country:'韩国',era:'2007–2018',profile:'counter',style:'chenLong',kit:'chenLong',difficulty:'advanced',seed:47,signature:'防守反击与网前变化'}),
  zhaoJianHua: freeze({id:'zhaoJianHua',name:'赵剑华',latin:'Zhao Jianhua',country:'中国',era:'1983–1992',profile:'attack',style:'taufik',kit:'taufik',difficulty:'expert',seed:48,signature:'手腕突击与网前细节'}),
});

// Guest rivals enlarge exhibition matchmaking without changing the 32-slot event format.
export const TOUR_ROSTER = freeze(Object.values(TOUR_STARS).filter(p=>p.seed<=32).sort((a,b)=>a.seed-b.seed).map(p=>p.id));
export const EXHIBITION_ROSTER = freeze(Object.values(TOUR_STARS).sort((a,b)=>a.seed-b.seed).map(p=>p.id));

export const TOUR_EVENTS = freeze([
  freeze({id:'allEngland',name:'全英公开赛',english:'YONEX All England Open',city:'伯明翰',venue:'Utilita Arena Birmingham',surface:'传统木地板',crowd:'经典满场',accent:'#d8bf74',courtTone:'#2b6658',runoffTone:'#214b43',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
  freeze({id:'indonesia',name:'印度尼西亚公开赛',english:'Indonesia Open',city:'雅加达',venue:'Istora Senayan',surface:'高速蓝地胶',crowd:'鼓点看台',accent:'#e66b4d',courtTone:'#1d5264',runoffTone:'#173d52',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
  freeze({id:'china',name:'中国公开赛',english:'China Open',city:'常州',venue:'常州奥体中心',surface:'中速地胶',crowd:'红色主场',accent:'#d64545',courtTone:'#2b5d55',runoffTone:'#4a302f',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
  freeze({id:'malaysia',name:'马来西亚公开赛',english:'Malaysia Open',city:'吉隆坡',venue:'Axiata Arena',surface:'快节奏地胶',crowd:'蓝金看台',accent:'#65b8d9',courtTone:'#205b70',runoffTone:'#204559',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
  freeze({id:'worlds',name:'世界羽联世锦赛',english:'BWF World Championships',city:'巴黎',venue:'Arena Paris Sud',surface:'中性比赛地胶',crowd:'世界聚光灯',accent:'#b88de0',courtTone:'#3b4b69',runoffTone:'#2d3555',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
  freeze({id:'olympics',name:'巴黎奥运会羽毛球赛',english:'Paris 2024 Olympic Badminton',city:'巴黎',venue:'Arena Porte de la Chapelle',surface:'奥运赛时场地',crowd:'巴黎奥运满场',accent:'#c6a7f2',courtTone:'#35a89b',runoffTone:'#7855a8',rounds:['32强','16强','8强','半决赛','决赛'],draw:TOUR_ROSTER}),
]);

export function star(id){return TOUR_STARS[id]||TOUR_STARS.peterGade;}
export function event(id){return TOUR_EVENTS.find(item=>item.id===id)||TOUR_EVENTS[0];}

const SEED_ORDER=[1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22];
const hashSeed=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0||1;};
const seededRandom=seed=>{let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};};
const seedOf=id=>id==='player'?1:star(id).seed;
export function chooseRandomOpponent(roster=EXHIBITION_ROSTER,recentIds=[],random=Math.random){
  const candidates=roster.filter(id=>TOUR_STARS[id]);
  if(!candidates.length)return 'peterGade';
  const recent=new Set(recentIds);
  const fresh=candidates.filter(id=>!recent.has(id));
  const pool=fresh.length?fresh:candidates;
  return pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999,random()))*pool.length))];
}
function seededShuffle(items,random){
  const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
}

function simulateMatch(match,random){
  if(match.player||match.winner||!match.a||!match.b)return;
  const sa=seedOf(match.a),sb=seedOf(match.b),favorite=sa<=sb?match.a:match.b;
  const gap=Math.min(24,Math.abs(sa-sb)),favoriteChance=.56+gap*.011;
  match.winner=random()<favoriteChance?favorite:(favorite===match.a?match.b:match.a);
}

// A complete seeded 32-slot knockout draw. The player takes seed 1 and all
// other 31 historic/current athletes occupy their published seed positions.
export function buildBracket(current,seed=hashSeed(current.id),recentOpponents=[]){
  const random=seededRandom(seed),rounds=[],opening=[];
  const opponentId=chooseRandomOpponent(current.draw,recentOpponents,random);
  // The player occupies one of the 32 slots, so the event draw contributes
  // only 31 athletes. Keep the chosen first-round rival, then pair 30 others.
  const remaining=seededShuffle(current.draw.filter(id=>id!==opponentId),random).slice(0,30);
  opening.push({a:'player',b:opponentId,winner:null,player:true});
  for(let i=0;i<remaining.length;i+=2)opening.push({a:remaining[i],b:remaining[i+1],winner:null,player:false});
  const shuffledMatches=seededShuffle(opening.slice(1),random);opening.splice(1,opening.length-1,...shuffledMatches);
  rounds.push(opening);
  for(let r=1;r<current.rounds.length;r++){
    const previous=rounds[r-1],matches=[];
    for(let i=0;i<previous.length;i+=2)matches.push({a:null,b:null,winner:null,player:i===0});
    rounds.push(matches);
  }
  for(let r=0;r<rounds.length;r++){
    for(const match of rounds[r])simulateMatch(match,random);
    if(r<rounds.length-1){
      const prev=rounds[r],next=rounds[r+1];
      for(let i=0;i<next.length;i++){
        const left=prev[i*2],right=prev[i*2+1];
        if(i===0){next[i].a='player';next[i].b=right.winner;}
        else{next[i].a=left.winner;next[i].b=right.winner;}
      }
    }
  }
  return rounds;
}

export function freshTour(eventId='allEngland',{recentOpponents=[]}={}){
  const current=event(eventId),startedAt=new Date().toISOString();
  const seed=hashSeed(`${current.id}:${startedAt}:${Math.random()}`);
  const bracket=buildBracket(current,seed,recentOpponents);
  return {eventId:current.id,roundIndex:0,opponentId:bracket[0][0].b,wins:0,losses:0,completed:false,eliminated:false,startedAt,bracket};
}

export function opponentForRound(current,roundIndex){
  const seed=[32,16,8,4,2][Math.min(roundIndex,4)];
  return current.draw.find(id=>star(id).seed===seed)||current.draw[0];
}

export function currentTourMatch(tour){
  if(!tour||tour.completed||tour.eliminated)return null;
  const e=event(tour.eventId),opponentId=tour.bracket?.[tour.roundIndex]?.[0]?.b||tour.opponentId||opponentForRound(e,tour.roundIndex);
  return {event:e,roundIndex:tour.roundIndex,round:e.rounds[tour.roundIndex]||e.rounds.at(-1),opponent:star(opponentId)};
}

export function advanceTour(tour,won){
  const next={...tour,bracket:(tour.bracket||buildBracket(event(tour.eventId))).map(round=>round.map(match=>({...match})))};
  const active=next.bracket[next.roundIndex]?.[0];
  if(active)active.winner=won?'player':active.b;
  if(!won){next.losses=(next.losses||0)+1;next.eliminated=true;return next;}
  next.wins=(next.wins||0)+1;
  if(next.roundIndex>=event(next.eventId).rounds.length-1){next.completed=true;return next;}
  next.roundIndex++;
  next.opponentId=next.bracket[next.roundIndex]?.[0]?.b||opponentForRound(event(next.eventId),next.roundIndex);
  return next;
}

export function tourStatus(tour){
  if(!tour)return '尚未报名';
  if(tour.completed)return '冠军';
  if(tour.eliminated)return '止步淘汰';
  const match=currentTourMatch(tour);return `${match?.round||'待定'} · ${match?.opponent?.name||''}`;
}
